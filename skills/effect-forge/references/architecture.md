# Architecture

## Target structure

```text
apps/
├─ api/
│  ├─ src/http/              HttpApi handlers
│  ├─ src/app.ts             dependency-open HTTP application graph
│  ├─ src/database.ts        database infrastructure resources
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
├─ database/src/<adapter>/
└─ auth-better/src/<adapter>/

alchemy.run.ts               stack composition
AGENTS.md                    repository rules
skills/effect-forge/         task guidance
```

## Dependency graph

```text
web → contracts, domain
api → core, contracts, database, auth-better
contracts → domain
core → domain
database → core, domain
auth-better → core, domain
```

Applications do not import one another. Adapter packages are imported only by `apps/api`. An architecture check must enforce these directions.

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
  → PostgreSQL or Better Auth adapter
```

TanStack Start server functions do not proxy ordinary application requests. Use them only when SSR or server-owned credentials require a web-server boundary.

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

`apps/api` composes application services, adapters, handlers, middleware, and the HTTP server. `apps/web` composes the React application, Atom registry, transport clients, and SSR runtime.

The root `alchemy.run.ts` composes the web and API infrastructure factories. TanStack Start deploys to Cloudflare through Alchemy's Vite website support. Each app provisions only the resources it consumes.
