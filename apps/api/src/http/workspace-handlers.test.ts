import { assert, describe, it } from "@effect/vitest";
import { WorkspaceApi } from "@effect-forge/contracts/workspace-api";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { Principal } from "@effect-forge/domain/identity";
import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Effect, Layer, Schema } from "effect";
import { HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { ApiTest } from "../test/api-test.ts";
import { authenticatedAs } from "../test/authenticated-as.ts";
import { ServerApi } from "./server-api.ts";
import { WorkspaceHandlers } from "./workspace-handlers.ts";

const principal = Schema.decodeSync(Principal)({
  userId: "550e8400-e29b-41d4-a716-446655440000",
  email: "ada@example.com",
  name: "Ada Lovelace",
});
const workspace = Workspace.make({
  id: WorkspaceId.make("123e4567-e89b-42d3-a456-426614174000"),
  name: WorkspaceName.make("Effect Forge"),
});

const serve = (directory: Layer.Layer<WorkspaceDirectory.Service>) =>
  ApiTest.layer(
    HttpApiBuilder.layer(ServerApi.Workspaces).pipe(
      Layer.provide(WorkspaceHandlers.layer),
      Layer.provide(authenticatedAs(principal)),
      Layer.provide(directory),
      Layer.provide(HttpServer.layerServices),
    ),
  );

const successLayer = serve(
  Layer.succeed(WorkspaceDirectory.Service, {
    create: () => Effect.succeed(workspace),
    list: () => Effect.succeed([workspace]),
  }),
);
const nameTakenLayer = serve(
  Layer.succeed(WorkspaceDirectory.Service, {
    create: (_principal, name) => Effect.fail(new WorkspaceStore.NameTaken({ name })),
    list: () => Effect.die("unexpected workspace list"),
  }),
);
const idFailureLayer = serve(
  Layer.succeed(WorkspaceDirectory.Service, {
    create: () => Effect.fail(new WorkspaceDirectory.IdGenerationError({ cause: "unavailable" })),
    list: () => Effect.die("unexpected workspace list"),
  }),
);
const persistenceFailure = new WorkspaceStore.PersistenceError({ cause: "unavailable" });
const persistenceFailureLayer = serve(
  Layer.succeed(WorkspaceDirectory.Service, {
    create: () => Effect.fail(persistenceFailure),
    list: () => Effect.fail(persistenceFailure),
  }),
);

describe("workspace HTTP API", () => {
  it.layer(successLayer)("successful operations", (it) => {
    it.effect("returns 201 for creation", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/api/workspaces", {
          method: "POST",
          body: { name: workspace.name },
        });

        assert.strictEqual(response.status, 201);
        assert.deepEqual(
          yield* Schema.decodeUnknownEffect(Workspace)(
            yield* Effect.promise(() => response.json()),
          ),
          workspace,
        );
      }),
    );

    it.effect("returns 200 for listing", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/api/workspaces");

        assert.strictEqual(response.status, 200);
        assert.deepEqual(
          yield* Schema.decodeUnknownEffect(Schema.Array(Workspace))(
            yield* Effect.promise(() => response.json()),
          ),
          [workspace],
        );
      }),
    );

    it.effect("returns 400 for malformed input", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/api/workspaces", {
          method: "POST",
          body: { name: " untrimmed" },
        });

        assert.strictEqual(response.status, 400);
      }),
    );
  });

  it.layer(nameTakenLayer)("name conflict", (it) => {
    it.effect("returns WorkspaceApi.NameTaken", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/api/workspaces", {
          method: "POST",
          body: { name: workspace.name },
        });

        assert.strictEqual(response.status, 409);
        assert.deepEqual(
          yield* Schema.decodeUnknownEffect(WorkspaceApi.NameTaken)(
            yield* Effect.promise(() => response.json()),
          ),
          new WorkspaceApi.NameTaken({ name: workspace.name }),
        );
      }),
    );
  });

  it.layer(idFailureLayer)("identifier generation failure", (it) => {
    it.effect("returns 500", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/api/workspaces", {
          method: "POST",
          body: { name: workspace.name },
        });

        assert.strictEqual(response.status, 500);
      }),
    );
  });

  it.layer(persistenceFailureLayer)("persistence failure", (it) => {
    it.effect("returns 500 for creation", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/api/workspaces", {
          method: "POST",
          body: { name: workspace.name },
        });

        assert.strictEqual(response.status, 500);
      }),
    );

    it.effect("returns 500 for listing", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        assert.strictEqual((yield* request("/api/workspaces")).status, 500);
      }),
    );
  });
});
