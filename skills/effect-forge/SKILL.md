---
name: effect-forge
description: Use when building, extending, reviewing, or debugging an Effect Forge repository. Triggers include TanStack Start routes, React UI, Effect Atom queries or mutations, TanStack Form, Effect services, ports, adapters, Layers, schemas, HttpApi or RPC contracts, PostgreSQL, Better Auth, tests, packages, and Alchemy resources.
---

# Effect Forge

Effect Forge is an AI-first monorepo with a TanStack Start web app, a separate Effect API, and application behavior composed through services, ports, adapters, and Layers.

## Read by task

- Repository structure, dependencies, transport, or deployment: [`references/architecture.md`](references/architecture.md)
- React, routing, Effect Atom, forms, SSR, or optimistic state: [`references/frontend.md`](references/frontend.md)
- Effect services, ports, schemas, errors, or Layers: [`references/effect-conventions.md`](references/effect-conventions.md)
- Adding an end-to-end capability: [`references/feature-workflow.md`](references/feature-workflow.md)
- Test placement, test Layers, or validation: [`references/testing.md`](references/testing.md)

Read the nearest `AGENTS.md`, inspect installed dependency versions, and follow an existing capability before writing code.

## Repository model

| Location | Responsibility |
|---|---|
| `apps/web` | TanStack Start, React, Effect Atom, and typed API client |
| `apps/api` | HTTP handlers and production Layer composition |
| `packages/domain` | pure shared domain vocabulary |
| `packages/core` | application services and owned ports |
| `packages/contracts` | public Effect `HttpApi` contracts |
| `packages/database` | PostgreSQL port adapters |
| `packages/auth-better` | Better Auth port adapters |

## Capability path

```text
React feature
  → Effect Atom query or mutation
  → typed transport client
  → API handler
  → application service
  → port
  → adapter
```

Use `HttpApi` for stable multi-client resources and workflows. Add Effect RPC only for a real private UI operation or stream. Use Alchemy RPC for trusted worker-to-worker calls.
