import { assert, describe, it } from "@effect/vitest";
import { WorkspaceName } from "@effect-forge/domain/workspace";
import { Crypto, Effect, Layer, Option, PlatformError, Schema } from "effect";
import { CryptoTest } from "../test/crypto-test.ts";
import { WorkspaceDirectory } from "./workspace-directory.ts";
import { WorkspaceStoreMemory } from "./workspace-store-memory.ts";
import { WorkspaceStore } from "./workspace-store.ts";

const workspaceName = Schema.decodeSync(WorkspaceName)("Effect Forge");

const testLayer = WorkspaceDirectory.layerWithoutDependencies.pipe(
  Layer.provideMerge(Layer.merge(CryptoTest.layer, WorkspaceStoreMemory.layer)),
);

const cryptoError = PlatformError.badArgument({
  module: "Crypto",
  method: "randomUUIDv4",
  description: "failed",
});
const cryptoFailureLayer = Layer.effect(
  Crypto.Crypto,
  Effect.gen(function* () {
    const crypto = yield* Crypto.Crypto;
    return Crypto.Crypto.of({ ...crypto, randomUUIDv4: Effect.fail(cryptoError) });
  }),
).pipe(Layer.provide(CryptoTest.layer));
const idFailureLayer = WorkspaceDirectory.layerWithoutDependencies.pipe(
  Layer.provideMerge(Layer.merge(cryptoFailureLayer, WorkspaceStoreMemory.layer)),
);

describe("WorkspaceDirectory", () => {
  it.layer(testLayer)("creation", (it) => {
    it.effect("creates and persists a workspace", () =>
      Effect.gen(function* () {
        const directory = yield* WorkspaceDirectory.Service;

        const created = yield* directory.create(workspaceName);
        const persisted = yield* directory.findById(created.id);

        assert.strictEqual(created.id, "00000000-0000-4000-8000-000000000000");
        assert.deepEqual(persisted, Option.some(created));
      }),
    );
  });

  it.layer(testLayer)("name conflict", (it) => {
    it.effect("rejects a duplicate workspace name", () =>
      Effect.gen(function* () {
        const directory = yield* WorkspaceDirectory.Service;

        yield* directory.create(workspaceName);
        const error = yield* directory.create(workspaceName).pipe(Effect.flip);

        assert.instanceOf(error, WorkspaceStore.NameTaken);
        assert.strictEqual(error.name, workspaceName);
      }),
    );
  });

  it.layer(idFailureLayer)("identifier generation", (it) => {
    it.effect("translates Crypto failures", () =>
      Effect.gen(function* () {
        const directory = yield* WorkspaceDirectory.Service;
        const error = yield* directory.create(workspaceName).pipe(Effect.flip);

        assert.instanceOf(error, WorkspaceDirectory.IdGenerationError);
        assert.strictEqual(error.cause, cryptoError);
      }),
    );
  });
});
