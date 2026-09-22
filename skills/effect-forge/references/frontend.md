# Frontend

## Ownership

| Tool               | Responsibility                                               |
| ------------------ | ------------------------------------------------------------ |
| SvelteKit          | routes, navigation, SSR, and deployment entry                |
| Remote `query`     | cached application reads                                     |
| Remote `form`      | validated application mutations                              |
| Better Auth Svelte | authentication, organization management, and session cookies |
| Effect Schema      | canonical boundary validation                                |
| Svelte runes       | component-local presentation state                           |

Do not add a client-side state or query library. A remote `query` is the cache; refresh it after a successful mutation.

## Environment and bindings

Alchemy's Worker `env` declaration contains both scalar configuration and native Cloudflare resources. Consume each through the interface that preserves its meaning:

| Value                                                        | Declaration                                                 | Consumption                        |
| ------------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------- |
| Public scalar                                                | Alchemy `env` and `apps/web/src/env.ts` with `public: true` | `$app/env/public`                  |
| Worker runtime scalar, secret, or native Cloudflare resource | Alchemy `env`                                               | `event.platform.env`               |
| Deployment input                                             | CI or local shell                                           | Effect `Config` in deployment code |
| Vite framework metadata                                      | Vite                                                        | `import.meta.env`                  |

Define browser-visible scalar configuration with SvelteKit's `defineEnvVars`. Public variables are an explicit browser-disclosure decision. Keep runtime-only Worker configuration on the typed platform environment so builds do not require placeholder secrets.

Use `import.meta.env` for Vite-owned metadata such as `MODE`, `DEV`, `PROD`, and `SSR`, not application configuration. When browser code needs a value derived from a resource or other server-only state, project only that value through a server load or remote function rather than exposing the binding.

## Remote functions

Keep each remote function with its feature. It owns the browser-to-server application boundary:

```text
component
  → query or form
  → validate untrusted input
  → resolve request principal
  → run core capability
  → project expected failure
```

Run core capabilities through [`locals.run(name, program)`](observability.md#application-operations), then project the returned `Result` at this boundary.

Use `query` for reads and `form` for progressively enhanced mutations. Use `command` only when a mutation cannot be represented as a form. Do not put business policy in the handler.

## Forms

Pass an Effect Schema to a remote `form` through Standard Schema. The remote boundary validates untrusted input before application code runs.

Use the remote form's `pending` state for submission feedback and disabling. Reserve component-local runes for presentation state the form does not own. Do not mirror server data in a client store.

Keep interaction lifecycles in feature components: fields, issues, pending feedback, optimistic updates, and reset behavior belong together. A list component may coordinate its forms; shared `ui` components remain feature-independent.

Distinguish an unconfirmed mutation from a confirmed mutation followed by failed navigation or query refresh. Once creation is confirmed, recovery should open or reload the created resource rather than repeat creation. Report unknown failures caught locally, including in Better Auth forms.

Compose visible inputs with the shared `Field.Field`, `Field.Label`, `Field.Description`, and `Field.Error` components as needed. Keep explicit label/control IDs and error descriptions; `Field` owns presentation, not validation or form state. Keep general submission failures at form level instead of marking an unrelated field invalid. Hidden inputs need no visual field wrapper.

Use `query.withOverride` with `submission.submit().updates(...)` for optimistic changes to existing records. Capture the intended value before applying the override; do not toggle it inside the override callback. Refresh the affected query after a successful mutation so authoritative data returns with the response.

Represent pending creation as a local draft, not a persisted domain record with a fabricated ID. With custom `form.enhance`, reset only when `submission.submit()` returns `true`; validation failures return `false` and must retain input. A transport failure may follow a committed write, so do not automatically retry or claim nothing was saved.

Keep mutation failures local unless they invalidate access to the page. Propagate denied access to SvelteKit's error handling; let Kit follow authentication redirects. Otherwise, roll back optimistic presentation, preserve input, and show the safe server message or an uncertainty toast. Report unknown client failures where they are caught, since they no longer reach `handleError`. Use `finally` for local presentation cleanup, and do not automatically retry an uncertain mutation.

## Error channels and recovery

Translate failures where their public meaning is known. Keep each translation with its owner: `AuthGuard` owns authentication redirects and availability errors, a feature remote module owns its application failures, and feature components own local mutation recovery and reporting. SvelteKit `handleError` hooks report unexpected failures that propagate to the framework, including server defects and client navigation/render failures.

| Channel                                                          | Boundary representation                | Browser recovery                                                             |
| ---------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| Correctable form input                                           | Remote-form issues                     | Render inline and preserve input                                             |
| Missing or expired identity                                      | Redirect from `AuthGuard`              | Navigate to sign-in; preserve a validated same-origin return path            |
| Revoked or denied page access                                    | Safe `403` SvelteKit error             | Leave the unauthorized context                                               |
| Resource disappeared during an interaction                       | Safe `404` SvelteKit error             | Roll back optimistic state, notify, and refresh the owning query             |
| Dependency rejected before a mutation began                      | Safe `503` SvelteKit error             | Preserve input or rollback; a deliberate retry is safe                       |
| Server mutation outcome cannot be confirmed                      | Safe `500`                             | Preserve input or rollback; reconcile authoritative state before retry       |
| Expected query or render failure                                 | Safe SvelteKit error                   | Render the route error boundary with an explicit reload or exit action       |
| Unexpected server defect during a mutation                       | `handleError` safe generic `500`       | Report privately; the form treats it as an unconfirmed outcome               |
| Unknown client submission failure, including transport rejection | Local diagnostic and uncertainty toast | Preserve input and roll back optimistic presentation; reconcile before retry |
| Client navigation or render failure                              | `handleError` safe generic `500`       | Report diagnostically and render the nearest error boundary                  |

HTTP status remains protocol metadata; interaction context determines recovery. The same status can require different behavior for a page query and a mutation, so do not introduce a global `App.Error` discriminator until multiple features share a stable policy that status plus local context cannot express. If such a discriminator becomes necessary, name actionable recovery states and require every `error(...)` call and both `handleError` hooks to provide one.

Project typed failure unions exhaustively with `Match.valueTags`. A new Effect failure should fail type checking until the feature boundary deliberately assigns a safe status and message. Test status, public wording, navigation, rollback, and reconciliation through the public SvelteKit boundary; do not export a private projection or add a production fault switch solely to unit-test it.

Keep server mutation messages conservative enough for native submissions too; enhanced forms reuse those safe messages. A server defect and an expected mutation failure can both arrive as `500`, so the form treats both as unconfirmed outcomes. Unknown client submission failures also receive uncertainty wording without guessing whether they are network errors or programming defects. Report the original failure with the client diagnostic mechanism (currently `console.error`) rather than swallowing it silently. A failed stale-resource refresh can propagate: the authoritative query then needs the error boundary.

`isHttpError` identifies a structured Kit error, not necessarily an application-authored message: failed HTTP responses outside the remote protocol can use HTTP status text. Safe application messages come from the server projections and hooks, not from the type guard itself.

Keep provider diagnostics, credentials, private identifiers, and retained causes out of browser-facing messages. Observability retains diagnostic context independently of this public projection.

## Authentication

Organization pages use `/organizations/[organizationSlug]/todos`. Resolve the slug from the authenticated directory already loaded by the page; return a uniform `404` for a missing or inaccessible match. Pass the resolved stable organization ID to todo queries and forms, and key organization-local UI by that ID. Slug resolution never replaces each operation's capability check; a revoked mounted form still receives `403`.

Slugs are mutable addresses, not permanent identity. Provider hooks validate the lowercase/alphanumeric, single-hyphen grammar and 48-character limit on create and update; HTML constraints alone are insufficient. Name changes do not change URLs; slug changes do. Old slug addresses have no redirect/history guarantee and may be reused. Do not shorten provider IDs or guess whether a route segment is a slug or an ID.

Better Auth is the exception to remote functions. Its Svelte client calls same-origin `/api/auth/*` routes directly so Better Auth owns request shape, cookies, and browser behavior.

A server layout may resolve the principal required by its pages and redirect anonymous users. Every remote function and endpoint still owns authorization for its operation.

Bind authentication to the current HTTP request. Protected layouts and remote functions authenticate independently, while the request-owned authentication service may memoize the one authoritative lookup. Redirect only an unauthenticated request; project provider unavailability as a safe error so an outage is not presented as a sign-out.

Use `AuthGuard.requireIdentity` inside protected operations. After `locals.run`, use `Result.getOrElse` when returning successful values unchanged, or `Result.match` when projecting success. Layouts project `{ viewer }` instead of returning the entire authenticated identity. Delegate authentication failures to `AuthGuard.reject`, project feature failures locally, and keep framework redirects outside Effect execution.

SvelteKit remote redirects own expired-session navigation. Do not make the browser perform a second provider session lookup after an authenticated remote function has already rejected the request.

Client-side role or permission checks may hide or disable controls, but they are never authoritative.

Keep memoized identity and membership evidence request-owned. Key membership lookups by explicit user and organization IDs, and evaluate each capability's permission independently. Invalidate user-dependent remote queries when authentication changes.

## SSR

The organizations list and organization-keyed todo section use pending boundaries to show local skeletons while their queries resolve. These sections render placeholders during SSR and load their content in the browser. The organizations creation form stays outside its list boundary. The universal `organizations/[organizationSlug]/+layout.ts` resolves the URL's organization and supplies `data.organization` to child pages; it does not load todos or select Better Auth's active organization. Query failures propagate to Kit's route error handling, and subsequent refreshes retain existing content rather than returning to the initial placeholder.

Hover preloading is enabled in `app.html`. `experimental.forkPreloads` in `apps/web/vite.config.ts` additionally lets Kit speculatively render destination components and start their remote queries.

### Remote-query preloading

Remote queries **can be awaited in universal `load` functions**. Kit's [query deduplication contract](https://svelte.dev/docs/kit/remote-functions#query-Deduplication) explicitly supports this and shares identical query keys with component consumers while the query remains in active use. There is no need for a separate query cache or HTTP endpoint. The absence of a dedicated `prefetch` method does not prevent route-load preloading.

Keep list reads in their components rather than await them in page loads solely to warm the cache. Kit waits for loads before rendering the destination, so an awaited list in a load would prevent its pending boundary from showing until the list finishes. Forked preloading starts the component-owned reads without introducing that load dependency. The organization layout deliberately awaits only the directory needed to resolve the route's identity; every remote operation still authorizes its own access.

Components continue consuming the live queries for refreshes and optimistic overrides. Cache lifetime follows active consumers and references, not a permanent route cache. Use Kit-owned preloading rather than manual hover handlers or application-managed cache retention. The relevant public contracts are [link preloading](https://svelte.dev/docs/kit/link-options#data-sveltekit-preload-data) and [universal load](https://svelte.dev/docs/kit/load#Universal-vs-server).

### Render modes

Resolve only data required to render the route. Keep authenticated state scoped to the SvelteKit request. Never retain principals, cookies, or request-scoped services in a shared mutable singleton.

Choose the remote-query render mode deliberately:

| Need                           | Pattern                                      | SSR output       |
| ------------------------------ | -------------------------------------------- | ---------------- |
| Data required for initial HTML | Async expression without a `pending` snippet | Resolved content |
| Intentionally deferred data    | `<svelte:boundary>` with a `pending` snippet | Placeholder      |

For required initial data, await the query through Svelte's async expression syntax. Use `{@const ... = await ...}` when the resolved value feeds multiple branches:

```svelte
<svelte:boundary>
	{@const todos = await listTodos(organizationId)}

	{#if todos.length === 0}
		<p>No todos yet.</p>
	{:else}
		<ul>
			{#each todos as todo}
				<li>{todo.title}</li>
			{/each}
		</ul>
	{/if}

	{#snippet failed()}
		<p>Todos are unavailable.</p>
	{/snippet}
</svelte:boundary>
```

For intentionally deferred data, make the loading state explicit. A boundary with a `pending` snippet renders that placeholder during SSR and starts its awaited content in the browser:

```svelte
<svelte:boundary>
	{#each await listActivity() as activity}
		<p>{activity.summary}</p>
	{/each}

	{#snippet pending()}
		<p>Loading activity…</p>
	{/snippet}

	{#snippet failed()}
		<p>Activity is unavailable.</p>
	{/snippet}
</svelte:boundary>
```

Do not use a traditional `{#await}` pending branch for data required in initial HTML.

The browser sees one public origin. Worker names, service bindings, provider credentials, and deployment origins remain server-side.
