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

const sameName = Workspace.make({
  id: WorkspaceId.make("123e4567-e89b-42d3-a456-426614174001"),
  name: workspace.name,
});

const unknownId = WorkspaceId.make("987e6543-e21b-42d3-a456-426614174000");

describe("PostgreSQL WorkspaceStore", () => {
  it.effect("finds an inserted workspace", () =>
    Effect.gen(function* () {
      const store = yield* WorkspaceStore.Service;
      yield* store.insert(workspace);
      assert.deepEqual(yield* store.findById(workspace.id), Option.some(workspace));
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("returns NameTaken for a duplicate name", () =>
    Effect.gen(function* () {
      const store = yield* WorkspaceStore.Service;
      yield* store.insert(workspace);
      const error = yield* store.insert(sameName).pipe(Effect.flip);
      assert.deepEqual(error, new WorkspaceStore.NameTaken({ name: workspace.name }));
    }).pipe(Effect.provide(testLayer)),
  );

  it.effect("returns None for an unknown id", () =>
    Effect.gen(function* () {
      const store = yield* WorkspaceStore.Service;
      assert.deepEqual(yield* store.findById(unknownId), Option.none());
    }).pipe(Effect.provide(testLayer)),
  );
});
