# Effect Forge

Read [`skills/effect-forge/SKILL.md`](skills/effect-forge/SKILL.md) before changing application code or architecture.

## Boundaries

```text
web → contracts, domain, ui, telemetry adapters
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

- TanStack Router owns routes, search parameters, loaders, and navigation.
- Effect Atom owns remote state, query lifetimes, invalidation, optimistic mutations, and streams. Do not add TanStack Query.
- TanStack Form owns unsaved form state and uses Effect schemas through Standard Schema. Decode transformed values again on submission.
- React state is limited to component-local presentation state.
- Create an `AtomRegistry` per SSR request and hydrate a browser registry. Never share authenticated atom state between requests.
- Do not proxy normal application calls through TanStack Start server functions. The browser calls the Effect API directly; server functions are reserved for SSR or server-owned credentials.

## Effect

- Parse untrusted input with `Schema` at the boundary.
- Represent expected failures with `Schema.TaggedErrorClass`.
- Define capabilities with `Context.Service` and construct them with `Layer`.
- Yield stable dependencies while constructing a service; service methods should not expose avoidable requirements.
- Name effectful operations with `Effect.fn`.
- Keep domain and application code independent of frameworks, SQL, and provider SDKs.

## Tests

Test through public interfaces using substitute Layers, PGlite, real HTTP boundaries, and an isolated Atom registry. Do not mock modules or use arbitrary sleeps.

A change is complete only after type checks, tests, formatting, architecture checks, and dead-code checks pass.
