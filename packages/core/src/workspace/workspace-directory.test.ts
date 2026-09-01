import { assert, describe, it } from "@effect/vitest";
import { EmailAddress } from "@effect-forge/domain/email-address";
import { Principal, UserId, UserName } from "@effect-forge/domain/identity";
import { WorkspaceName } from "@effect-forge/domain/workspace";
import { Effect, Layer, PlatformError, Schema } from "effect";
import { CryptoDeterministic } from "../test/crypto-deterministic.ts";
import { WorkspaceDirectory } from "./workspace-directory.ts";
import { WorkspaceStoreMemory } from "./workspace-store-memory.ts";

const principal = Principal.make({
  userId: UserId.make("550e8400-e29b-41d4-a716-446655440000"),
  email: EmailAddress.make("ada@example.com"),
  name: UserName.make("Ada Lovelace"),
});
const other = Principal.make({
  userId: UserId.make("7c9e6679-7425-40de-944b-e07fc1f90ae7"),
  email: EmailAddress.make("grace@example.com"),
  name: UserName.make("Grace Hopper"),
});
const workspaceName = Schema.decodeSync(WorkspaceName)("Effect Forge");

const testLayer = WorkspaceDirectory.layer.pipe(
  Layer.provideMerge(Layer.merge(CryptoDeterministic.layer, WorkspaceStoreMemory.layer)),
);

const cryptoError = PlatformError.badArgument({
  module: "Crypto",
  method: "randomUUIDv4",
  description: "failed",
});
const failureLayer = WorkspaceDirectory.layer.pipe(
  Layer.provideMerge(
    Layer.merge(
      CryptoDeterministic.randomUUIDFailureLayer(cryptoError),
      WorkspaceStoreMemory.layer,
    ),
  ),
);

describe("WorkspaceDirectory", () => {
  it.layer(testLayer)("principal scope", (it) => {
    it.effect("creates an owner-visible workspace", () =>
      Effect.gen(function* () {
        const directory = yield* WorkspaceDirectory.Service;
        const created = yield* directory.create(principal, workspaceName);
        assert.deepEqual(yield* directory.list(principal), [created]);
        assert.deepEqual(yield* directory.list(other), []);
      }),
    );
  });
  it.layer(failureLayer)("identifier generation", (it) => {
    it.effect("translates Crypto failures", () =>
      Effect.gen(function* () {
        const directory = yield* WorkspaceDirectory.Service;
        const error = yield* directory.create(principal, workspaceName).pipe(Effect.flip);
        assert.instanceOf(error, WorkspaceDirectory.IdGenerationError);
        assert.strictEqual(error.cause, cryptoError);
      }),
    );
  });
});
