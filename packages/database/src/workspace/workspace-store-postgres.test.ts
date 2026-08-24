import { assert, describe, it } from "@effect/vitest";
import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Effect, Layer, Option } from "effect";
import { DatabasePglite } from "../test/database-pglite.ts";
import { WorkspaceStorePostgres } from "./workspace-store-postgres.ts";

const testLayer = WorkspaceStorePostgres.layer.pipe(Layer.provide(DatabasePglite.layer));

const workspace = Workspace.make({
  id: WorkspaceId.make("123e4567-e89b-42d3-a456-426614174000"),
  name: WorkspaceName.make("Effect Forge"),
});

describe("PostgreSQL WorkspaceStore", () => {
  it.layer(testLayer)("stored workspace", (it) => {
    it.effect("finds an inserted workspace", () =>
      Effect.gen(function* () {
        const store = yield* WorkspaceStore.Service;
        yield* store.insert(workspace);
        assert.deepEqual(yield* store.findById(workspace.id), Option.some(workspace));
      }),
    );
  });

  it.layer(testLayer)("name conflict", (it) => {
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

  it.layer(testLayer)("missing workspace", (it) => {
    it.effect("returns None", () =>
      Effect.gen(function* () {
        const store = yield* WorkspaceStore.Service;
        assert.deepEqual(
          yield* store.findById(WorkspaceId.make("987e6543-e21b-42d3-a456-426614174000")),
          Option.none(),
        );
      }),
    );
  });
});
