# Effect Forge

Read [`skills/effect-forge/SKILL.md`](skills/effect-forge/SKILL.md) before changing application code or architecture.

## Boundaries

```text
web → core, domain, ui, database, auth, and telemetry adapters
api → core, contracts, database, auth, and telemetry adapters
database-postgres → core, domain
auth-better → core, domain
contracts → domain
core → domain
domain → nothing
telemetry adapters → nothing
ui → nothing
```

- `apps/*` are deployable composition roots.
- `packages/*` contain application-owned or shared technology-neutral modules.
- `adapters/*` contain concrete integrations with external technology.
- `domain` contains pure shared values, schemas, and decisions.
- `core` contains application services and the ports they own.
- `contracts` defines the public Effect `HttpApi`.
- `ui` owns the shared visual vocabulary.
- adapters translate between ports and concrete technology.
- only composition roots provide production adapter Layers.

## Web

- SvelteKit owns routes, navigation, SSR, and the deployment entry.
- Define scalar web configuration in `apps/web/src/env.ts`; consume public and private values through `$app/env`, and access native Cloudflare resources through `event.platform.env`.
- Remote functions own application calls from the browser. A `query` is the cache; a `form` is the mutation. Do not add a client-side state library.
- Remote handlers invoke core capabilities directly. The web app does not call the public API as an implementation detail.
- Better Auth is the deliberate exception: its Svelte client calls the same-origin `/api/auth/*` routes directly so the provider owns its browser protocol and cookies.
- Effect Schema validates remote form input through Standard Schema. Remote handlers map expected failures to SvelteKit `error` or `invalid` results.
- Svelte runes are limited to component-local presentation state.
- Server layouts resolve principals required by their pages; remote handlers and endpoints own authorization for their operations.

## Effect

- Parse untrusted input with `Schema` at the boundary.
- Represent expected failures with `Schema.TaggedErrorClass`.
- Define capabilities with `Context.Service` and construct them with `Layer`.
- Yield stable dependencies while constructing a service; service methods should not expose avoidable requirements.
- Name effectful operations with `Effect.fn`.
- Keep domain and application code independent of frameworks, SQL, and provider SDKs.

## Tests

Test through public interfaces using substitute Layers, PGlite, and real HTTP or SvelteKit boundaries. Do not mock modules or use arbitrary sleeps.

A change is complete only after type checks, tests, formatting, architecture checks, and dead-code checks pass.
