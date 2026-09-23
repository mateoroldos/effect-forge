# Architecture

## Structure

```text
apps/
├─ web/                        SvelteKit composition root
│  ├─ worker.ts                deployment declaration and bindings
│  └─ src/
│     ├─ routes/               pages, layouts, endpoints
│     └─ lib/
│        ├─ features/          remote functions and feature UI
│        └─ server/            runtime and Layer composition
└─ site/                       project landing page

packages/
├─ domain/                     pure values, schemas, and decisions
├─ core/                       application services, owned ports, and canonical graph
└─ ui/                         shared Svelte visual vocabulary

adapters/
└─ database-postgres/          PostgreSQL port implementations

infra/                         shared deployment resources and stage policy
alchemy.run.ts                 application Stack summary
AGENTS.md                      repository rules
.agents/skills/effect-forge/           task guidance
```

## Dependency graph

```text
web → core, domain, ui, database, telemetry
core → domain
database-postgres → core, domain
ui → nothing
```

Applications do not import one another. Packages are technology-neutral. Adapters translate concrete technology into ports owned by core. Only composition roots select production Layers. The architecture check enforces these directions.

## Ownership

Better Auth owns users, credentials, sessions, organizations, memberships, and organization administration. Application resources such as todos belong to an organization; do not introduce another tenant or membership authority. Provider types do not enter core.

Authorization has two boundaries:

- Better Auth protects its authentication and session endpoints.
- Core protects application operations and invariants.

Client permission checks are presentational only.

Declare application permissions beside their capability, following `TodoDirectory`.
Use `OrganizationAccess.require(principal, organizationId, permission)` before accessing
the store. Owners retain authority; grants to admin and member roles are explicit.
Supply membership evidence through `OrganizationMembership`; lookup failures are not denials.
Keep every resource read and write organization-scoped, including updates by resource ID.

## Request flows

```text
browser
  → SvelteKit remote function
  → core application service
  → owned port
  → production adapter
```

```text
browser
  → same-origin /api/auth/*
  → Web-local Better Auth handler
  → PostgreSQL
```

Web invokes core services directly rather than through an internal HTTP API. Introduce a future public API as a peer composition root only when an independent client has concrete operations and credential requirements.

## Composition

`packages/core` exports one dependency-open `Application.layer` for request-callable application services. Its unresolved requirements are the capabilities each composition root must provide.

`apps/web` composes SvelteKit, Better Auth, `Application.layer`, adapters, and server telemetry. Tests provide the application graph with substitute capabilities.

`infra/database.ts` owns shared database provisioning and `infra/stage.ts` owns deterministic host policy. Application-root `worker.ts` files declare each Worker's runtime and bindings. The root `alchemy.run.ts` remains a concise Stack summary that composes those declarations.

Browser-visible scalar configuration is declared in `apps/web/src/env.ts` and consumed through `$app/env/public`. Worker runtime configuration and native Cloudflare resources remain on `event.platform.env`; Vite variables are reserved for Vite-owned build metadata.

`apps/web/src/lib/server/runtime.ts` composes one lazy runtime per SvelteKit request, exposed through `locals.run(name, program)`. The first operation awaits service acquisition. `request-runner.ts` owns execution, cancellation binding, and cause-preserving Result conversion; `observability.ts` owns operation summaries and severity. Feature boundaries project typed failures into public responses.

After response-producing work settles, `hooks.server.ts` schedules `runtime.dispose()` through `ctx.waitUntil` without awaiting cleanup for the response. Do not defer runtime-dependent work into streamed response bodies.

`postgres.ts` owns two request-scoped PostgreSQL clients: one for Better Auth's Drizzle adapter and one for application persistence through Effect SQL. Separate clients keep provider transactions from interleaving with application SQL. The authentication client handles independent socket error events. Better Auth promises settle before interruption can release their database resources; configured background-capable operations also use the provider's default awaited execution.

Authentication is bound to the request and memoized as one Effect result. A separate HTTP request receives a new runtime, bypasses Better Auth's cookie cache, and reads the authoritative session again. Protected application reads deliberately disable session refresh: ordinary page activity does not extend the provider's default seven-day session lifetime. Cloudflare does not expose an isolate shutdown hook, and Hyperdrive discourages global database clients, so database ownership remains request-scoped. Principal and organization ID remain explicit application-operation inputs rather than runtime services. Treat the session's active organization as navigation state, never as authorization or an implicit mutation target.

See [observability](observability.md) for the runner contract, operation summaries, and export configuration.

## Database stages

```text
prod
  → production Neon project and protected branch

staging
  → shared non-production Neon project and staging branch

dev_* or pr-*
  → isolated branch in the staging project
```

Deploy `staging` before developer or preview stages. Developer branches are durable. Preview branches should be destroyed when their pull request closes and expire after seven days as a fallback. Production and non-production never share a Neon project.

Hyperdrive targets the branch's direct origin in Cloudflare and its pooled origin locally. Alchemy applies migrations during deployment, never during Worker startup or requests.
