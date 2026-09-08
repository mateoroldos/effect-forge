---
name: effect-forge
description: Use when building, extending, reviewing, or debugging an Effect Forge repository. Triggers include SvelteKit routes and remote functions, Svelte UI, Effect services, ports, adapters, Layers, schemas, HttpApi contracts, PostgreSQL, Better Auth, tests, packages, and Alchemy resources.
---

# Effect Forge

Effect Forge is an AI-first monorepo with a SvelteKit web app and a public Effect API composed over shared application capabilities.

## Read by task

- Repository structure, dependencies, transport, or deployment: [`references/architecture.md`](references/architecture.md)
- Svelte, routing, remote functions, forms, or SSR: [`references/frontend.md`](references/frontend.md)
- Effect services, ports, schemas, errors, or Layers: [`references/effect-conventions.md`](references/effect-conventions.md)
- Adding an end-to-end capability: [`references/feature-workflow.md`](references/feature-workflow.md)
- Test placement, test Layers, or validation: [`references/testing.md`](references/testing.md)

Read the nearest `AGENTS.md`, inspect installed dependency versions, and follow an existing capability before writing code.

## Repository model

| Location                     | Responsibility                                     |
| ---------------------------- | -------------------------------------------------- |
| `apps/web`                   | SvelteKit web application and server composition   |
| `apps/api`                   | Public Effect API and server composition           |
| `packages/domain`            | Pure shared values, schemas, and decisions         |
| `packages/core`              | Application services and owned ports               |
| `packages/contracts`         | Public Effect `HttpApi` contracts                  |
| `packages/ui`                | Shared Svelte components and visual vocabulary     |
| `adapters/database-postgres` | PostgreSQL port implementations                    |
| `adapters/auth-better`       | Better Auth and provider translation               |
| `apps/*`                     | Production Layers and runtime-native observability |

## Capability paths

```text
browser
  → SvelteKit remote function
  → application service
  → owned port
  → adapter
```

```text
external client
  → public Effect HttpApi
  → application service
  → owned port
  → adapter
```

Remote functions are the web application's native server boundary. `HttpApi` is the stable public boundary for independent clients. Do not route internal web calls through the public API.
