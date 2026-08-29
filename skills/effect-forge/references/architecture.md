# Architecture

## Target structure

```text
apps/
├─ api/
│  ├─ src/http/              HttpApi handlers
│  ├─ src/app.ts             dependency-open HTTP application graph
│  ├─ src/infrastructure/    database and telemetry resources
│  └─ src/worker.ts          Worker entrypoint and production composition
└─ web/
   ├─ src/routes/            TanStack Start routes
   ├─ src/features/          capability UI
   ├─ src/lib/api/           typed transport clients
   ├─ src/lib/atoms/         shared Effect atoms
   └─ alchemy.run.ts         web infrastructure

packages/
├─ domain/src/<capability>/
├─ core/src/<service>/
├─ contracts/src/<api>/
└─ ui/src/                    shared visual vocabulary

adapters/
├─ database-postgres/src/     PostgreSQL port implementations
└─ auth-better/src/           Better Auth port implementations

alchemy.run.ts               stack composition
AGENTS.md                    repository rules
skills/effect-forge/         task guidance
```

## Dependency graph

```text
web → contracts, domain, ui, Maple browser SDK
api → core, contracts, database and auth adapters, OTLP telemetry
contracts → domain
core → domain
database-postgres → core, domain
auth-better → core, domain
ui → nothing
```

Applications do not import one another. `packages/*` contain application-owned or shared technology-neutral modules. `adapters/*` translate concrete technology into owned ports and are selected only by composition roots. Effect's observability services are the telemetry seam: the API uses Alchemy's Worker-native OTLP lifecycle to export to Maple, while the web composition root installs Maple's browser-native Layer directly. The architecture check enforces these directions.

## Package conventions

Declare each dependency in the workspace package that imports it. Put versions shared across workspaces in the root Bun catalog and reference them with `catalog:`. Use `workspace:*` for internal packages.

Run unit tests through package-local `vitest run` scripts and let Turbo orchestrate them from the root. This preserves package-level caching and filtering. Add root Vitest Projects only when a concrete need such as unified coverage justifies giving up that cache boundary.

## Request flow

```text
browser
  → AtomHttpApi query or mutation
  → apps/api HttpApi handler
  → packages/core application service
  → application-owned port
  → adapters/database-postgres or adapters/auth-better
```

TanStack Start server functions do not proxy ordinary application requests. Use them only when SSR or server-owned credentials require a web-server boundary.

## Database stages

```text
prod
  → owns the production Neon project
  → owns a protected production branch

staging
  → owns the shared non-production Neon project
  → owns the staging branch

dev_* or pr-*
  → references the staging project
  → owns an isolated stage branch
```

Deploy `staging` before developer or preview stages. Developer branches are durable. Preview branches expire after seven days as a fallback and should normally be removed with `alchemy destroy` when the pull request closes. Production and non-production never share a Neon project.

Hyperdrive targets a branch's direct origin in Cloudflare and its pooled origin during local development. Migrations apply to the branch during Alchemy deployment, not during Worker startup or requests.

## Transport tiers

| Transport        | Audience                                                           |
| ---------------- | ------------------------------------------------------------------ |
| Effect `HttpApi` | stable resources used by web, mobile, CLI, agents, or integrations |
| Effect RPC       | private UI operations or streams that may change with the web app  |
| Alchemy RPC      | trusted worker-to-worker calls                                     |

Start with `HttpApi`. Add another transport only with an operation that belongs to it.

## Web runtime

TanStack Router owns navigation and route loading. Effect Atom owns application server state. TanStack Form owns editable form drafts.

Create an `AtomRegistry` for each SSR request, seed it from route data when needed, serialize hydration state, and hydrate one browser registry. A module-level server registry must never retain authenticated state.

## Composition

`apps/api` composes application services, adapters, handlers, middleware, telemetry, and the HTTP server. `apps/web` composes the React application, Atom registry, transport clients, and SSR runtime.

The root `alchemy.run.ts` composes the web and API infrastructure factories. TanStack Start deploys to Cloudflare through Alchemy's Vite website support. Each app provisions only the resources it consumes.

## Telemetry

Effect's observability services are the application seam, and telemetry is disabled by default. When enabled, the API exports OTLP to Maple through Alchemy's Worker lifecycle; the browser installs Maple in its Atom runtime so HTTP spans propagate trace context.

Local Maple is keyless at `http://127.0.0.1:4318`. Hosted Maple requires separate server and browser ingest keys. Session metadata, replay, and TanStack Start server telemetry remain disabled.
