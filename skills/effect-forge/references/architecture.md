# Architecture

## Structure

```text
apps/
├─ web/                        SvelteKit composition root
│  └─ src/
│     ├─ routes/               pages, layouts, endpoints
│     └─ lib/
│        ├─ features/          remote functions and feature UI
│        └─ server/            runtime and Layer composition
├─ api/                        public Effect API composition root
│  └─ src/
│     ├─ http/                 HttpApi handlers
│     ├─ app.ts                dependency-open HTTP graph
│     └─ worker.ts             production composition
└─ site/                       project landing page

packages/
├─ domain/                     pure values, schemas, and decisions
├─ core/                       application services and owned ports
├─ contracts/                  public HttpApi contracts
└─ ui/                         shared Svelte visual vocabulary

adapters/
├─ database-postgres/          PostgreSQL port implementations
└─ auth-better/                Better Auth and provider translation

alchemy.run.ts                 infrastructure composition
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

`apps/web` composes SvelteKit, core services, adapters, and server telemetry. `apps/api` composes public contracts, handlers, the same core services, adapters, and server telemetry.

The root `alchemy.run.ts` composes their infrastructure. Each application provisions only the resources it consumes.

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
