import { Principal } from "@effect-forge/domain/identity";
import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Context, Crypto, Effect, Layer, Schema } from "effect";
import { WorkspaceStore } from "./workspace-store.ts";

const decodeWorkspaceId = Schema.decodeSync(WorkspaceId);

/** Principal-scoped workspace operations. */
export interface Interface {
  readonly create: (
    principal: Principal,
    name: WorkspaceName,
  ) => Effect.Effect<
    Workspace,
    IdGenerationError | WorkspaceStore.NameTaken | WorkspaceStore.PersistenceError
  >;
  readonly list: (
    principal: Principal,
  ) => Effect.Effect<ReadonlyArray<Workspace>, WorkspaceStore.PersistenceError>;
}

/** Creates and retrieves workspaces visible to application principals. */
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

  const create = Effect.fn("WorkspaceDirectory.create")(function* (
    principal: Principal,
    name: WorkspaceName,
  ) {
    const rawId = yield* crypto.randomUUIDv4.pipe(
      Effect.mapError((cause) => new IdGenerationError({ cause })),
    );
    return yield* store.create(
      Workspace.make({ id: decodeWorkspaceId(rawId), name }),
      principal.userId,
    );
  });

  const list = Effect.fn("WorkspaceDirectory.list")((principal: Principal) =>
    store.list(principal.userId),
  );

  return Service.of({ create, list });
});

/** Builds `WorkspaceDirectory` while leaving its platform and persistence dependencies open. */
export const layer = Layer.effect(Service, make);

export * as WorkspaceDirectory from "./workspace-directory.ts";
