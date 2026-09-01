import { assert, describe, it } from "@effect/vitest";
import { WorkspaceApi } from "@effect-forge/contracts/workspace-api";
import { IdentityDirectory } from "@effect-forge/core/identity-directory";
import { ProviderAccount } from "@effect-forge/core/provider-account";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { WorkspaceStore } from "@effect-forge/core/workspace-store";
import { CryptoDeterministic } from "@effect-forge/core/test/crypto-deterministic";
import { PersistencePglite } from "@effect-forge/database-postgres/test/persistence-pglite";
import { Workspace, WorkspaceName } from "@effect-forge/domain/workspace";
import { Effect, Layer, Option, Schema } from "effect";
import { App } from "./app.ts";
import { ApiTest } from "../test/api-test.ts";
import { RequestAuth } from "./request-auth.ts";

const account = Schema.decodeSync(ProviderAccount)({
  identity: { provider: "test", subject: "user-1" },
  email: "ada@example.com",
  name: "Ada Lovelace",
});
const storeLayer = PersistencePglite.layer;
const workspaceLayer = WorkspaceDirectory.layer.pipe(
  Layer.provide(Layer.merge(CryptoDeterministic.layer, storeLayer)),
);
const identityLayer = IdentityDirectory.layer.pipe(
  Layer.provide(Layer.merge(CryptoDeterministic.layer, storeLayer)),
);
const signedIn = Layer.succeed(RequestAuth.Authenticator, {
  identify: () => Effect.succeedSome(account),
});
const signedOut = Layer.succeed(RequestAuth.Authenticator, {
  identify: () => Effect.succeed(Option.none()),
});
const serve = (authenticator: typeof signedIn, workspaces: typeof workspaceLayer) =>
  ApiTest.layer(
    App.layer.pipe(Layer.provide(Layer.mergeAll(identityLayer, authenticator, workspaces))),
  );

const testLayer = serve(signedIn, workspaceLayer);

const idFailureWorkspaceLayer = Layer.succeed(
  WorkspaceDirectory.Service,
  WorkspaceDirectory.Service.of({
    create: () => Effect.fail(new WorkspaceDirectory.IdGenerationError({ cause: "unavailable" })),
    list: () => Effect.die("unexpected workspace list"),
  }),
);
const idFailureLayer = serve(signedIn, idFailureWorkspaceLayer);

const persistenceFailure = new WorkspaceStore.PersistenceError({ cause: "unavailable" });
const persistenceFailureWorkspaceLayer = Layer.succeed(
  WorkspaceDirectory.Service,
  WorkspaceDirectory.Service.of({
    create: () => Effect.fail(persistenceFailure),
    list: () => Effect.fail(persistenceFailure),
  }),
);
const persistenceFailureLayer = serve(signedIn, persistenceFailureWorkspaceLayer);
const anonymousLayer = serve(signedOut, workspaceLayer);

describe("workspace HTTP API", () => {
  it.layer(anonymousLayer)("anonymous request", (it) => {
    it.effect("returns 401", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        assert.strictEqual((yield* request("/workspaces")).status, 401);
      }),
    );
  });

  it.layer(testLayer)("creation", (it) => {
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

        const listResponse = yield* request("/workspaces");
        assert.strictEqual(listResponse.status, 200);
        assert.deepEqual(
          yield* Schema.decodeUnknownEffect(Schema.Array(Workspace))(
            yield* Effect.promise(() => listResponse.json()),
          ),
          [created],
        );
      }),
    );
  });

  it.layer(testLayer)("name conflict", (it) => {
    it.effect("returns WorkspaceApi.NameTaken", () =>
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
        const error = yield* Schema.decodeUnknownEffect(WorkspaceApi.NameTaken)(
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

  it.layer(persistenceFailureLayer)("list persistence failure", (it) => {
    it.effect("returns 500", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/workspaces");

        assert.strictEqual(response.status, 500);
      }),
    );
  });

  it.layer(testLayer)("malformed name", (it) => {
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
});
