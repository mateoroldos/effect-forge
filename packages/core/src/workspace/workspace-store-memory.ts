import { UserId } from "@effect-forge/domain/identity";
import { Workspace, WorkspaceId } from "@effect-forge/domain/workspace";
import { Effect, Layer, Ref } from "effect";
import { WorkspaceStore } from "./workspace-store.ts";

interface Entry {
  readonly workspace: Workspace;
  readonly ownerId: UserId;
}

/** Provides atomic in-memory workspace persistence for tests. */
export const layer = Layer.effect(
  WorkspaceStore.Service,
  Effect.gen(function* () {
    const state = yield* Ref.make(new Map<WorkspaceId, Entry>());
    return WorkspaceStore.Service.of({
      list: (userId) =>
        Ref.get(state).pipe(
          Effect.map((entries) =>
            Array.from(entries.values())
              .filter((entry) => entry.ownerId === userId)
              .map((entry) => entry.workspace),
          ),
        ),
      create: (workspace, ownerId) =>
        Ref.modify(
          state,
          (
            entries,
          ): readonly [
            Effect.Effect<Workspace, WorkspaceStore.NameTaken>,
            Map<WorkspaceId, Entry>,
          ] => {
            if (
              Array.from(entries.values()).some((entry) => entry.workspace.name === workspace.name)
            ) {
              return [Effect.fail(new WorkspaceStore.NameTaken({ name: workspace.name })), entries];
            }
            return [
              Effect.succeed(workspace),
              new Map(entries).set(workspace.id, { workspace, ownerId }),
            ];
          },
        ).pipe(Effect.flatten),
    });
  }),
);

export * as WorkspaceStoreMemory from "./workspace-store-memory.ts";
