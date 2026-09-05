import { assert, describe, it } from "@effect/vitest";
import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { UserId } from "@effect-forge/domain/identity";
import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Effect, Layer } from "effect";
import { Database } from "../internal/database.ts";
import { PersistencePglite } from "../test/persistence-pglite.ts";
import { workspaceMembers, workspaces } from "./schema.ts";

const ownerId = UserId.make("better-auth-user-1");
const otherId = UserId.make("better-auth-user-2");
const workspace = Workspace.make({
  id: WorkspaceId.make("123e4567-e89b-42d3-a456-426614174000"),
  name: WorkspaceName.make("Effect Forge"),
});
const testLayer = Layer.merge(PersistencePglite.layer, PersistencePglite.databaseLayer);

describe("PostgreSQL WorkspaceStore", () => {
  it.layer(testLayer)("principal scope", (it) => {
    it.effect("atomically creates the workspace and owner membership", () =>
      Effect.gen(function* () {
        const store = yield* WorkspaceStore.Service;
        yield* store.create(workspace, ownerId);

        assert.deepEqual(yield* store.list(ownerId), [workspace]);
        assert.deepEqual(yield* store.list(otherId), []);
        const database = yield* Database.Service;
        assert.deepEqual(yield* database.select().from(workspaceMembers), [
          { workspaceId: workspace.id, userId: ownerId, role: "owner" },
        ]);
      }),
    );
  });

  it.layer(testLayer)("name conflict", (it) => {
    it.effect("returns NameTaken without creating another membership", () =>
      Effect.gen(function* () {
        const store = yield* WorkspaceStore.Service;
        yield* store.create(workspace, ownerId);
        const duplicate = Workspace.make({
          id: WorkspaceId.make("123e4567-e89b-42d3-a456-426614174001"),
          name: workspace.name,
        });

        assert.instanceOf(
          yield* store.create(duplicate, ownerId).pipe(Effect.flip),
          WorkspaceStore.NameTaken,
        );

        const database = yield* Database.Service;
        assert.lengthOf(yield* database.select().from(workspaces), 1);
        assert.lengthOf(yield* database.select().from(workspaceMembers), 1);
      }),
    );
  });
});
