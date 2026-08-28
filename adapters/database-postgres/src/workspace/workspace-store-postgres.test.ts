import { assert, describe, it } from "@effect/vitest";
import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Effect } from "effect";
import { PersistencePglite } from "../test/persistence-pglite.ts";

const workspace = Workspace.make({
  id: WorkspaceId.make("123e4567-e89b-42d3-a456-426614174000"),
  name: WorkspaceName.make("Effect Forge"),
});

describe("PostgreSQL WorkspaceStore", () => {
  it.layer(PersistencePglite.layer)("stored workspaces", (it) => {
    it.effect("lists inserted workspaces", () =>
      Effect.gen(function* () {
        const store = yield* WorkspaceStore.Service;
        yield* store.insert(workspace);
        assert.deepEqual(yield* store.list, [workspace]);
      }),
    );
  });

  it.layer(PersistencePglite.layer)("name conflict", (it) => {
    it.effect("returns NameTaken", () =>
      Effect.gen(function* () {
        const store = yield* WorkspaceStore.Service;
        yield* store.insert(workspace);
        const sameName = Workspace.make({
          id: WorkspaceId.make("123e4567-e89b-42d3-a456-426614174001"),
          name: workspace.name,
        });
        const error = yield* store.insert(sameName).pipe(Effect.flip);
        assert.deepEqual(error, new WorkspaceStore.NameTaken({ name: workspace.name }));
      }),
    );
  });
});
