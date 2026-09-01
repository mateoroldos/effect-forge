import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer, PlatformError, Schema } from "effect";
import { CryptoDeterministic } from "../test/crypto-deterministic.ts";
import { IdentityDirectory } from "./identity-directory.ts";
import { IdentityStoreMemory } from "./identity-store-memory.ts";
import { IdentityStore } from "./identity-store.ts";
import { ProviderAccount } from "./provider-account.ts";

const decodeAccount = Schema.decodeSync(ProviderAccount);
const account = decodeAccount({
  identity: { provider: "primary", subject: "provider-user-1" },
  email: "ada@example.com",
  name: "Ada Lovelace",
});

const testLayer = IdentityDirectory.layer.pipe(
  Layer.provideMerge(Layer.merge(CryptoDeterministic.layer, IdentityStoreMemory.layer)),
);

const cryptoError = PlatformError.badArgument({
  module: "Crypto",
  method: "randomUUIDv4",
  description: "failed",
});
const idFailureLayer = IdentityDirectory.layer.pipe(
  Layer.provideMerge(
    Layer.merge(CryptoDeterministic.randomUUIDFailureLayer(cryptoError), IdentityStoreMemory.layer),
  ),
);

describe("IdentityDirectory", () => {
  it.layer(testLayer)("resolution", (it) => {
    it.effect("provisions one stable principal under concurrent first requests", () =>
      Effect.gen(function* () {
        const directory = yield* IdentityDirectory.Service;
        const principals = yield* Effect.all(
          [directory.resolve(account), directory.resolve(account)],
          {
            concurrency: "unbounded",
          },
        );

        assert.deepEqual(principals[0], principals[1]);
      }),
    );

    it.effect("rejects an email already owned by another external identity", () =>
      Effect.gen(function* () {
        const directory = yield* IdentityDirectory.Service;
        yield* directory.resolve(account);
        const conflicting = decodeAccount({
          ...account,
          identity: { provider: "secondary", subject: "provider-user-2" },
        });

        const error = yield* directory.resolve(conflicting).pipe(Effect.flip);
        assert.instanceOf(error, IdentityStore.EmailTaken);
      }),
    );
  });

  it.layer(idFailureLayer)("identifier generation", (it) => {
    it.effect("translates Crypto failures", () =>
      Effect.gen(function* () {
        const directory = yield* IdentityDirectory.Service;
        const error = yield* directory.resolve(account).pipe(Effect.flip);

        assert.instanceOf(error, IdentityDirectory.IdGenerationError);
        assert.strictEqual(error.cause, cryptoError);
      }),
    );
  });
});
