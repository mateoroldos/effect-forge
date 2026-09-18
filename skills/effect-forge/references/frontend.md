# Frontend

## Ownership

| Tool               | Responsibility                                     |
| ------------------ | -------------------------------------------------- |
| SvelteKit          | routes, navigation, SSR, and deployment entry      |
| Remote `query`     | cached application reads                           |
| Remote `form`      | validated application mutations                    |
| Better Auth Svelte | native authentication protocol and session cookies |
| Effect Schema      | canonical boundary validation                      |
| Svelte runes       | component-local presentation state                 |

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

Map failures where they become meaningful:

- Field-correctable failures → `invalid` with field issues.
- Expected page-level failures → SvelteKit `error` or a safe form message.
- Defects and interruptions → remain defects and interruptions.

Keep provider diagnostics, credentials, and private identifiers out of browser-facing messages.

Use component-local runes for pending presentation or UI state not already owned by the remote form. Do not mirror server data in a client store.

## Authentication

Better Auth is the exception to remote functions. Its Svelte client calls same-origin `/api/auth/*` routes directly so Better Auth owns request shape, cookies, and browser behavior.

A server layout may resolve the principal required by its pages and redirect anonymous users. Every remote function and endpoint still owns authorization for its operation.

Bind authentication to the current HTTP request. Protected layouts and remote functions authenticate independently, while the request-owned authentication service may memoize the one authoritative lookup. Redirect only an unauthenticated request; project provider unavailability as a safe error so an outage is not presented as a sign-out.

SvelteKit remote redirects own expired-session navigation. Do not make the browser perform a second provider session lookup after an authenticated remote function has already rejected the request.

Client-side role or permission checks may hide or disable controls, but they are never authoritative.

## SSR

Resolve only data required to render the route. Keep authenticated state scoped to the SvelteKit request. Never retain principals, cookies, or request-scoped services in a shared mutable singleton.

Choose the remote-query render mode deliberately:

| Need                           | Pattern                                      | SSR output       |
| ------------------------------ | -------------------------------------------- | ---------------- |
| Data required for initial HTML | Async expression without a `pending` snippet | Resolved content |
| Intentionally deferred data    | `<svelte:boundary>` with a `pending` snippet | Placeholder      |

For required initial data, await the query through Svelte's async expression syntax. Use `{@const ... = await ...}` when the resolved value feeds multiple branches:

```svelte
<svelte:boundary>
	{@const workspaces = await listWorkspaces()}

	{#if workspaces.length === 0}
		<p>No workspaces yet.</p>
	{:else}
		<ul>
			{#each workspaces as workspace}
				<li>{workspace.name}</li>
			{/each}
		</ul>
	{/if}

	{#snippet failed()}
		<p>Workspaces are unavailable.</p>
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
