import { Workspace, WorkspaceName } from "@effect-forge/domain/workspace";
import { Context, Effect, Schema } from "effect";

export interface Interface {
  readonly list: Effect.Effect<ReadonlyArray<Workspace>, PersistenceError>;
  readonly insert: (workspace: Workspace) => Effect.Effect<Workspace, NameTaken | PersistenceError>;
}

/** Persists workspaces for workspace application operations. */
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
