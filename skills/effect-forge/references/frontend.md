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
| Private scalar or secret                                     | Alchemy `env` and a private `apps/web/src/env.ts` entry     | `$app/env/private`                 |
| Worker, Hyperdrive, D1, KV, R2, or other Cloudflare resource | Alchemy resource binding                                    | `event.platform.env`               |
| Deployment input                                             | CI or local shell                                           | Effect `Config` in deployment code |
| Vite framework metadata                                      | Vite                                                        | `import.meta.env`                  |

Define and parse scalar application configuration once with SvelteKit's `defineEnvVars`. Variables are dynamic by default; use `static: true` only when build-time replacement is required and verified. Public variables are an explicit browser-disclosure decision. Never expose secrets through public variables or model resource bindings as scalar environment variables.

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

Remote handlers call core capabilities directly through the web runtime. They do not call the public API.

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

Client-side role or permission checks may hide or disable controls, but they are never authoritative.

## SSR

Resolve only data required to render the route. Keep authenticated state scoped to the SvelteKit request. Never retain principals, cookies, or request-scoped services in a shared mutable singleton.

The browser sees one public origin. Worker names, service bindings, provider credentials, and deployment origins remain server-side.
