# Effect conventions

Verify these shapes against the installed Effect version before implementation.

## Domain

Domain modules contain pure schemas, values, invariants, and decisions shared across boundaries.

```ts
export const AgentId = Schema.String.pipe(Schema.check(Schema.isUUID(4)), Schema.brand("AgentId"));
export type AgentId = typeof AgentId.Type;
```

Parse unknown input at framework boundaries and raw provider data in adapters. Pass domain values inward.

Default records to `Schema.Struct(...)` plus a same-name interface:

```ts
export const Agent = Schema.Struct({
  id: AgentId,
  name: AgentName,
});

export interface Agent extends Schema.Schema.Type<typeof Agent> {}
```

Use class semantics only when the domain requires them.

Pure authorization and entitlement decisions belong here. Keep provider roles, subscription objects, and SDK types in adapters.

## Application modules

```text
packages/core/src/agent/
├─ agent-directory.ts
├─ agent-store.ts
└─ agent-directory.test.ts
```

Create a subdirectory only when several cohesive files need one boundary.

Use file-local role names and one canonical self-exported ES module namespace:

```ts
export interface Interface {
  readonly create: (name: AgentName) => Effect.Effect<Agent, AgentStore.NameTaken>;
}

export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/AgentDirectory",
) {}

export * as AgentDirectory from "./agent-directory.ts";
```

Consumers use the exported namespace directly:

```ts
import { AgentDirectory } from "./agent-directory.ts";

const directory = yield * AgentDirectory.Service;
```

Yield stable dependencies while constructing a service. Pass request values such as the principal as method input. Keep method requirement channels empty unless a dependency is genuinely operation-scoped.

Core owns application workflows and enforcement. It does not own framework handlers, SQL, provider protocols, or SDK objects.

## Ports and adapters

An application service owns the smallest domain-shaped capability it needs:

```text
AgentDirectory
  → AgentStore
    ├─ AgentStorePostgres
    └─ AgentStoreMemory
```

Adapters decode external values and translate technology failures into port failures. A port does not expose SQL, HTTP, SDK clients, or provider errors. Production adapters live outside core; substitute adapters implement the same port.

Do not create a port in anticipation of a provider. Add it when an application workflow needs the capability.

## Errors

Expected failures are typed values owned by the boundary that introduces them:

```ts
export class PersistenceError extends Schema.TaggedError<PersistenceError>()(
  "AgentStore.PersistenceError",
  { cause: Schema.Defect() },
) {}
```

A port owns stable errors that its adapters produce. An application service owns workflow errors and may propagate port errors when it adds no meaning. Adapters retain technology failures as diagnostic causes without exposing them in public messages.

Framework handlers project application failures into their public protocol. Defects and interruptions remain defects and interruptions.

## Layers

- Export a Layer with dependencies open when callers or tests must select them.
- Export a production-ready Layer only when the package owns every nested implementation.
- Reuse Layer values so memoization preserves one resource instance.
- Use scoped Layers for resources with cleanup.
- Provide production adapters only in deployable composition roots.
- Register request-callable core services once in the dependency-open `Application.layer`.
- Derive its exposed services with `Layer.Success<typeof layer>` and its unresolved requirements with `Layer.Services<typeof layer>`.
- Keep inbound protocol graphs dependency-open; web, API, and tests provide `Application.layer` with their selected adapters.
- Keep queue consumers, schedulers, migration runners, and forever-running fibers outside the request-callable application graph.
