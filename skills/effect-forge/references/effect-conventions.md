# Effect conventions

Verify these shapes against the installed Effect version before implementation.

## Domain

Domain modules contain pure schemas, values, invariants, and decisions shared across boundaries.

```ts
export const AgentId = Schema.String.pipe(
  Schema.check(Schema.isUUID(4)),
  Schema.brand("AgentId"),
)
export type AgentId = typeof AgentId.Type
```

Parse unknown input in HTTP handlers and raw provider data in adapters. Pass domain values inward.

## Application service

```text
packages/core/src/agent-directory/
├─ index.ts
├─ agent-directory.ts
└─ agent-store/
   ├─ index.ts
   └─ agent-store.ts
```

```ts
export interface Interface {
  readonly create: (input: CreateInput) => Effect.Effect<Agent, CreateError>
}

export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/AgentDirectory",
) {}

const make = Effect.gen(function* () {
  const store = yield* AgentStore.Service

  const create = Effect.fn("AgentDirectory.create")(function* (input) {
    return yield* store.create(input)
  })

  return Service.of({ create })
})

export const layerWithoutDependencies = Layer.effect(Service, make)
```

Yield stable dependencies in `make`. Pass request values such as an authenticated principal as method input. Keep method requirement channels empty unless the dependency is genuinely operation-scoped.

## Ports and adapters

The application service owns the smallest domain-shaped capability it needs. A port does not expose SQL, HTTP, SDK clients, or provider error types.

```text
AgentDirectory
  → AgentStore
    ├─ AgentStorePostgres
    └─ AgentStoreMemory
```

Adapters decode external values and translate technology failures into port failures. Production adapters live outside `core`; substitute adapters are provided by tests.

## Errors

Expected failures are typed values:

```ts
export class NotFound extends Schema.TaggedErrorClass<NotFound>()(
  "AgentDirectory.NotFound",
  { id: AgentId },
) {}
```

Translate failures at ownership boundaries. HTTP handlers project application failures into the public API error schema. Defects and interruptions remain defects and interruptions.

## Layers

- Export a Layer with dependencies open when callers or tests must select them.
- Export a production-ready Layer only when the package owns all nested implementations.
- Reuse Layer values so memoization preserves one resource instance.
- Use scoped Layers for resources with cleanup.
- Provide production Layers only in deployable composition roots.
