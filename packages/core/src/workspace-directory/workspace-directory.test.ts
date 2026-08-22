import { assert, describe, it } from "@effect/vitest";
import { WorkspaceName } from "@effect-forge/domain/workspace";
import { Crypto, Effect, Layer, Option, Schema } from "effect";
import { WorkspaceDirectory } from "./workspace-directory.ts";
import { WorkspaceStoreMemory } from "./workspace-store-memory.ts";
import { WorkspaceStore } from "./workspace-store.ts";

const workspaceName = Schema.decodeSync(WorkspaceName)("Effect Forge");

const cryptoLayer = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    randomBytes: (size) => new Uint8Array(size),
    digest: (_algorithm, data) => Effect.succeed(data),
  }),
);

const testLayer = WorkspaceDirectory.layerWithoutDependencies.pipe(
  Layer.provideMerge(Layer.mergeAll(cryptoLayer, WorkspaceStoreMemory.layer)),
);

describe("WorkspaceDirectory", () => {
  it.layer(testLayer)("create", (it) => {
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

  it.layer(testLayer)("duplicate name", (it) => {
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
});
