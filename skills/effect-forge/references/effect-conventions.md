# Effect conventions

Verify these shapes against the installed Effect version before implementation.

## Domain

Domain modules contain pure schemas, values, invariants, and decisions shared across boundaries.

```ts
export const AgentId = Schema.String.pipe(Schema.check(Schema.isUUID(4)), Schema.brand("AgentId"));
export type AgentId = typeof AgentId.Type;
```

Parse unknown input in HTTP handlers and raw provider data in adapters. Pass domain values inward.

Default records to `Schema.Struct(...)` plus a same-name interface:

```ts
export const Agent = Schema.Struct({
  id: AgentId,
  name: AgentName,
});

export interface Agent extends Schema.Schema.Type<typeof Agent> {}
```

Default records to `Schema.Struct`; use class semantics only when the domain requires them. Follow Effect Kit for construction and the installed Effect version's schema APIs.

## Application modules

```text
packages/core/src/agent-directory/
├─ agent-directory.ts
├─ agent-store.ts
└─ agent-directory.test.ts
```

Create a subdirectory only when several cohesive files need one shared boundary.

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

Consumers use a named import without defining their own alias:

```ts
import { AgentDirectory } from "./agent-directory.ts";

const directory = yield * AgentDirectory.Service;
```

Yield stable dependencies while constructing a service. Pass request values such as an authenticated principal as method input. Keep method requirement channels empty unless a dependency is genuinely operation-scoped.

## Ports and adapters

The application service owns the smallest domain-shaped capability it needs. A port does not expose SQL, HTTP, SDK clients, or provider error types.

```text
AgentDirectory
  → AgentStore
    ├─ AgentStorePostgres
    └─ AgentStoreMemory
```

Adapters decode external values and translate technology failures into port failures. Production adapters live outside `core`; substitute adapters implement the same port.

## Errors

Expected failures are typed values owned by the boundary that introduces them:

```ts
export class PersistenceError extends Schema.TaggedError<PersistenceError>()(
  "AgentStore.PersistenceError",
  { cause: Schema.Defect() },
) {}
```

A port owns stable errors that its adapters produce. An application service owns workflow errors and may propagate port errors when it adds no new meaning. Keep technology errors behind adapters and retain underlying causes for diagnostics.

HTTP handlers project application failures into public API errors. Defects and interruptions remain defects and interruptions.

## Layers

- Export a Layer with dependencies open when callers or tests must select them.
- Export a production-ready Layer only when the package owns all nested implementations.
- Reuse Layer values so memoization preserves one resource instance.
- Use scoped Layers for resources with cleanup.
- Provide production Layers only in deployable composition roots.
