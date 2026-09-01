import { assert, describe, it } from "@effect/vitest";
import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { UserId } from "@effect-forge/domain/identity";
import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Effect, Layer } from "effect";
import { users } from "../identity/schema.ts";
import { Database } from "../internal/database.ts";
import { PersistencePglite } from "../test/persistence-pglite.ts";
import { workspaceMembers, workspaces } from "./schema.ts";

const ownerId = UserId.make("550e8400-e29b-41d4-a716-446655440000");
const otherId = UserId.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");
const workspace = Workspace.make({
  id: WorkspaceId.make("123e4567-e89b-42d3-a456-426614174000"),
  name: WorkspaceName.make("Effect Forge"),
});
const testLayer = Layer.merge(PersistencePglite.layer, PersistencePglite.databaseLayer);

const insertUser = (id: UserId, email: string) =>
  Effect.flatMap(Database.Service, (database) =>
    database.insert(users).values({ id, email, name: "Test User" }),
  );

describe("PostgreSQL WorkspaceStore", () => {
  it.layer(testLayer)("principal scope", (it) => {
    it.effect("atomically creates the workspace and owner membership", () =>
      Effect.gen(function* () {
        yield* insertUser(ownerId, "owner@example.com");
        yield* insertUser(otherId, "other@example.com");
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
        yield* insertUser(ownerId, "owner@example.com");
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
