import { assert, describe, it } from "@effect/vitest";
import { Workspaces } from "@effect-forge/contracts/workspaces";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Effect, Schema } from "effect";
import { ApiTest } from "../test/api-test.ts";

const idFailureLayer = ApiTest.layerWithDirectory(
  WorkspaceDirectory.Service.of({
    create: () => Effect.fail(new WorkspaceDirectory.IdGenerationError({ cause: "unavailable" })),
    findById: () => Effect.die("unexpected workspace lookup"),
  }),
);

const persistenceFailure = new WorkspaceStore.PersistenceError({ cause: "unavailable" });
const persistenceFailureLayer = ApiTest.layerWithDirectory(
  WorkspaceDirectory.Service.of({
    create: () => Effect.fail(persistenceFailure),
    findById: () => Effect.fail(persistenceFailure),
  }),
);

describe("workspace HTTP API", () => {
  it.layer(ApiTest.layer)("creation", (it) => {
    it.effect("returns 201 and retrieves the workspace", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const createResponse = yield* request("/workspaces", {
          method: "POST",
          body: { name: "Effect Forge" },
        });
        assert.strictEqual(createResponse.status, 201);
        const created = yield* Schema.decodeUnknownEffect(Workspace)(
          yield* Effect.promise(() => createResponse.json()),
        );

        const findResponse = yield* request(`/workspaces/${created.id}`);
        assert.strictEqual(findResponse.status, 200);
        assert.deepEqual(
          yield* Schema.decodeUnknownEffect(Workspace)(
            yield* Effect.promise(() => findResponse.json()),
          ),
          created,
        );
      }),
    );
  });

  it.layer(ApiTest.layer)("name conflict", (it) => {
    it.effect("returns WorkspaceNameTaken", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const created = yield* request("/workspaces", {
          method: "POST",
          body: { name: "Effect Forge" },
        });
        assert.strictEqual(created.status, 201);

        const response = yield* request("/workspaces", {
          method: "POST",
          body: { name: "Effect Forge" },
        });

        assert.strictEqual(response.status, 409);
        const error = yield* Schema.decodeUnknownEffect(Workspaces.WorkspaceNameTaken)(
          yield* Effect.promise(() => response.json()),
        );
        assert.strictEqual(error.name, WorkspaceName.make("Effect Forge"));
      }),
    );
  });

  it.layer(idFailureLayer)("identifier generation failure", (it) => {
    it.effect("returns 500", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/workspaces", {
          method: "POST",
          body: { name: "Effect Forge" },
        });

        assert.strictEqual(response.status, 500);
      }),
    );
  });

  it.layer(ApiTest.layer)("missing workspace", (it) => {
    it.effect("returns WorkspaceNotFound", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const id = WorkspaceId.make("987e6543-e21b-42d3-a456-426614174000");
        const response = yield* request(`/workspaces/${id}`);

        assert.strictEqual(response.status, 404);
        const error = yield* Schema.decodeUnknownEffect(Workspaces.WorkspaceNotFound)(
          yield* Effect.promise(() => response.json()),
        );
        assert.strictEqual(error.id, id);
      }),
    );
  });

  it.layer(persistenceFailureLayer)("creation persistence failure", (it) => {
    it.effect("returns 500", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/workspaces", {
          method: "POST",
          body: { name: "Effect Forge" },
        });

        assert.strictEqual(response.status, 500);
      }),
    );
  });

  it.layer(persistenceFailureLayer)("retrieval persistence failure", (it) => {
    it.effect("returns 500", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/workspaces/987e6543-e21b-42d3-a456-426614174000");

        assert.strictEqual(response.status, 500);
      }),
    );
  });

  it.layer(ApiTest.layer)("malformed name", (it) => {
    it.effect("returns 400", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/workspaces", {
          method: "POST",
          body: { name: " untrimmed" },
        });

        assert.strictEqual(response.status, 400);
      }),
    );
  });

  it.layer(ApiTest.layer)("malformed identifier", (it) => {
    it.effect("returns 400", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/workspaces/not-a-uuid");
        assert.strictEqual(response.status, 400);
      }),
    );
  });
});
