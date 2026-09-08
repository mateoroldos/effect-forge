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
├─ api/                        public Effect API composition root
│  ├─ worker.ts                production runtime and deployment declaration
│  └─ src/
│     ├─ http/                 HttpApi handlers
│     └─ app.ts                dependency-open HTTP graph
└─ site/                       project landing page

packages/
├─ domain/                     pure values, schemas, and decisions
├─ core/                       application services, owned ports, and canonical graph
├─ contracts/                  public HttpApi contracts
└─ ui/                         shared Svelte visual vocabulary

adapters/
├─ database-postgres/          PostgreSQL port implementations
└─ auth-better/                Better Auth and provider translation

infra/                         shared deployment resources and stage policy
alchemy.run.ts                 application Stack summary
AGENTS.md                      repository rules
skills/effect-forge/           task guidance
```

## Dependency graph

```text
web → core, domain, ui, database, auth, telemetry
api → core, contracts, database, auth, telemetry
contracts → domain
core → domain
database-postgres → core, domain
auth-better → core, domain
ui → nothing
```

Applications do not import one another. Packages are technology-neutral. Adapters translate concrete technology into ports owned by core. Only composition roots select production Layers. The architecture check enforces these directions.

## Ownership

Better Auth owns users, sessions, organizations, memberships, stored roles, and invitations. The application owns the meaning of a permission and the behavior allowed by a plan. Adapters translate provider records into application vocabulary; provider types do not enter core.

`Workspace` is the application's name for a Better Auth organization. Do not persist a competing authoritative workspace or membership model.

Authorization has two boundaries:

- Better Auth protects its organization and session endpoints.
- Core protects application operations and invariants.

Client permission checks are presentational only.

## Request flows

```text
browser
  → SvelteKit remote function
  → core application service
  → owned port
  → production adapter
```

```text
external client
  → Effect HttpApi contract
  → apps/api handler
  → the same core application service
  → owned port
  → production adapter
```

```text
browser
  → same-origin /api/auth/*
  → Better Auth handler
```

The web and API are peer composition roots. The web app does not call the API as an internal transport. The API exists for mobile, desktop, CLI, agents, integrations, and other independent clients.

## Composition

`packages/core` exports one dependency-open `Application.layer` for request-callable application services. Its unresolved requirements are the capabilities each composition root must provide.

`apps/web` composes SvelteKit, `Application.layer`, adapters, and server telemetry. `apps/api` keeps its HttpApi graph dependency-open and provides `Application.layer`, adapters, and server telemetry from its Worker. Tests provide the same application graph with substitute capabilities.

`infra/database.ts` owns shared database provisioning and `infra/stage.ts` owns deterministic host policy. Application-root `worker.ts` files declare each Worker's runtime and bindings. The root `alchemy.run.ts` remains a concise Stack summary that composes those declarations.

SvelteKit scalar configuration is declared in `apps/web/src/env.ts` and consumed through `$app/env/public` or `$app/env/private`. Native Cloudflare resources remain on `event.platform.env`; Vite variables are reserved for Vite-owned build metadata.

Server-side SvelteKit operations enter the application through `apps/web/src/lib/server/application.ts`. `hooks.server.ts` builds one managed runtime from the request's native `DATABASE` binding, shares it through `event.locals` for that request, and disposes it after SvelteKit resolves the response. Cloudflare does not expose an isolate shutdown hook, and Hyperdrive discourages global database clients, so the runtime must not outlive the request. Principal and workspace context remain explicit operation inputs rather than runtime services.

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

## Telemetry

Effect's observability services are the server seam. Each composition root installs its runtime-native telemetry Layer. Browser telemetry uses the browser SDK directly.

Telemetry is disabled by default. Hosted telemetry uses separate private server and publishable browser ingest keys. Never expose provider credentials, diagnostics, or private deployment origins to the browser.
