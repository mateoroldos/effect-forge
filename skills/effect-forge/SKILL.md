---
name: effect-forge
description: Use when building, extending, reviewing, or debugging an Effect Forge repository. Triggers include SvelteKit routes and remote functions, Svelte UI, Effect services, ports, adapters, Layers, schemas, PostgreSQL, Better Auth, tests, packages, and Alchemy resources.
---

# Effect Forge

Effect Forge is an AI-first monorepo with a SvelteKit application that hosts Better Auth and composes application services over shared infrastructure.

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
| `apps/web`                   | SvelteKit, Better Auth, and server composition     |
| `packages/domain`            | Pure shared values, schemas, and decisions         |
| `packages/core`              | Application services and owned ports               |
| `packages/ui`                | Shared Svelte components and visual vocabulary     |
| `adapters/database-postgres` | PostgreSQL port implementations                    |
| `apps/*`                     | Production Layers and runtime-native observability |

## Capability paths

```text
browser
  → SvelteKit remote function
  → application service
  → owned port
  → adapter
```

Better Auth's Svelte client calls the provider handler on the same-origin Web route. Remote functions are the web application's native server boundary and invoke core directly. Add a public contract only when an independent client demonstrates one.
