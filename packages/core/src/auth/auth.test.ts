import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, PlatformError, Schema } from "effect";
import { CryptoTest } from "../test/crypto-test.ts";
import { Auth } from "./auth.ts";
import { IdentityStoreMemory } from "./identity-store-memory.ts";
import { IdentityStore } from "./identity-store.ts";
import { ProviderAccount } from "./provider-account.ts";

const decodeAccount = Schema.decodeSync(ProviderAccount);
const account = decodeAccount({
  identity: { source: "primary", subject: "provider-user-1" },
  email: "ada@example.com",
  name: "Ada Lovelace",
});

const testLayer = Auth.layerWithoutDependencies.pipe(
  Layer.provideMerge(Layer.merge(CryptoTest.layer, IdentityStoreMemory.layer)),
);

const cryptoError = PlatformError.badArgument({
  module: "Crypto",
  method: "randomUUIDv4",
  description: "failed",
});
const idFailureLayer = Auth.layerWithoutDependencies.pipe(
  Layer.provideMerge(
    Layer.merge(CryptoTest.randomUUIDFailureLayer(cryptoError), IdentityStoreMemory.layer),
  ),
);

describe("Auth", () => {
  it.layer(testLayer)("resolution", (it) => {
    it.effect("provisions one stable principal under concurrent first requests", () =>
      Effect.gen(function* () {
        const auth = yield* Auth.Service;
        const principals = yield* Effect.all([auth.resolve(account), auth.resolve(account)], {
          concurrency: "unbounded",
        });

        assert.deepEqual(principals[0], principals[1]);
      }),
    );

    it.effect("rejects an email already owned by another external identity", () =>
      Effect.gen(function* () {
        const auth = yield* Auth.Service;
        yield* auth.resolve(account);
        const conflicting = decodeAccount({
          ...account,
          identity: { source: "secondary", subject: "provider-user-2" },
        });

        const error = yield* auth.resolve(conflicting).pipe(Effect.flip);
        assert.instanceOf(error, IdentityStore.AccountConflict);
      }),
    );
  });

  it.layer(idFailureLayer)("identifier generation", (it) => {
    it.effect("translates Crypto failures", () =>
      Effect.gen(function* () {
        const auth = yield* Auth.Service;
        const error = yield* auth.resolve(account).pipe(Effect.flip);

        assert.instanceOf(error, Auth.IdGenerationError);
        assert.strictEqual(error.cause, cryptoError);
      }),
    );
  });
});
