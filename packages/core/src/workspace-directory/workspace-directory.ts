import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Context, Crypto, Effect, Layer, Schema } from "effect";
import { WorkspaceStore } from "./workspace-store.ts";

const decodeWorkspaceId = Schema.decodeSync(WorkspaceId);

export interface Interface {
  readonly create: (
    name: WorkspaceName,
  ) => Effect.Effect<
    Workspace,
    IdGenerationError | WorkspaceStore.NameTaken | WorkspaceStore.PersistenceError
  >;
  readonly list: Effect.Effect<ReadonlyArray<Workspace>, WorkspaceStore.PersistenceError>;
}

/** Creates and retrieves workspaces. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/WorkspaceDirectory",
) {}

/** Indicates that secure workspace identifier generation failed. */
export class IdGenerationError extends Schema.TaggedError<IdGenerationError>()(
  "WorkspaceDirectory.IdGenerationError",
  { cause: Schema.Defect() },
) {}

const make = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto;
  const store = yield* WorkspaceStore.Service;

  const create = Effect.fn("WorkspaceDirectory.create")(function* (name: WorkspaceName) {
    const rawId = yield* crypto.randomUUIDv4.pipe(
      Effect.mapError((cause) => new IdGenerationError({ cause })),
    );
    const id = decodeWorkspaceId(rawId);

    return yield* store.insert(Workspace.make({ id, name }));
  });

  return Service.of({ create, list: store.list });
});

/** Builds `WorkspaceDirectory` while leaving its platform and persistence dependencies open. */
export const layerWithoutDependencies = Layer.effect(Service, make);

export * as WorkspaceDirectory from "./workspace-directory.ts";
