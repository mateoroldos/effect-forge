import { UserId } from "@effect-forge/domain/identity";
import { Workspace, WorkspaceName } from "@effect-forge/domain/workspace";
import { Context, Effect, Schema } from "effect";

/** Persistence required by principal-scoped workspace operations. */
export interface Interface {
  readonly create: (
    workspace: Workspace,
    ownerId: UserId,
  ) => Effect.Effect<Workspace, NameTaken | PersistenceError>;
  readonly list: (userId: UserId) => Effect.Effect<ReadonlyArray<Workspace>, PersistenceError>;
}

/** Persists workspaces with membership ownership. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/WorkspaceStore",
) {}

/** Indicates that a workspace name is already in use. */
export class NameTaken extends Schema.TaggedError<NameTaken>()("WorkspaceStore.NameTaken", {
  name: WorkspaceName,
}) {}

/** Indicates that workspace persistence failed. */
export class PersistenceError extends Schema.TaggedError<PersistenceError>()(
  "WorkspaceStore.PersistenceError",
  { cause: Schema.Defect() },
) {}

export * as WorkspaceStore from "./workspace-store.ts";
