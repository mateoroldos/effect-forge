import { Workspace, WorkspaceId } from "@effect-forge/domain/workspace";
import { Effect, Layer, Option, Ref } from "effect";
import { WorkspaceStore } from "./workspace-store.ts";

export const layer = Layer.effect(
  WorkspaceStore.Service,
  Effect.gen(function* () {
    const state = yield* Ref.make(new Map<WorkspaceId, Workspace>());

    return WorkspaceStore.Service.of({
      findById: (id) =>
        Ref.get(state).pipe(Effect.map((workspaces) => Option.fromNullishOr(workspaces.get(id)))),
      insert: (workspace) =>
        Ref.modify(
          state,
          (
            workspaces,
          ): readonly [
            Effect.Effect<Workspace, WorkspaceStore.NameTaken>,
            Map<WorkspaceId, Workspace>,
          ] => {
            const nameTaken = Array.from(workspaces.values()).some(
              (existing) => existing.name === workspace.name,
            );

            if (nameTaken) {
              return [
                Effect.fail(new WorkspaceStore.NameTaken({ name: workspace.name })),
                workspaces,
              ];
            }

            return [Effect.succeed(workspace), new Map(workspaces).set(workspace.id, workspace)];
          },
        ).pipe(Effect.flatten),
    });
  }),
);

export * as WorkspaceStoreMemory from "./workspace-store-memory.ts";
