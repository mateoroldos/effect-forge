import { assert, describe, it } from "@effect/vitest";
import { IdentityStore } from "@effect-forge/core/identity-store";
import { ProviderAccount } from "@effect-forge/core/provider-account";
import { UserId } from "@effect-forge/domain/identity";
import { Effect, Layer, Schema } from "effect";
import { Database } from "../internal/database.ts";
import { providerIdentities, users } from "./schema.ts";
import { PersistencePglite } from "../test/persistence-pglite.ts";

const account = Schema.decodeSync(ProviderAccount)({
  identity: { provider: "primary", subject: "user-1" },
  email: "ada@example.com",
  name: "Ada Lovelace",
});
const firstId = UserId.make("550e8400-e29b-41d4-a716-446655440000");
const secondId = UserId.make("7c9e6679-7425-40de-944b-e07fc1f90ae7");
const conflictingAccount = Schema.decodeSync(ProviderAccount)({
  ...account,
  identity: { provider: "secondary", subject: "user-2" },
});

const testLayer = Layer.merge(PersistencePglite.layer, PersistencePglite.databaseLayer);

describe("PostgreSQL IdentityStore", () => {
  it.layer(testLayer)("provisioning", (it) => {
    it.effect("creates once under concurrent first requests", () =>
      Effect.gen(function* () {
        const store = yield* IdentityStore.Service;
        const [first, second] = yield* Effect.all(
          [store.resolveOrCreate(account, firstId), store.resolveOrCreate(account, secondId)],
          { concurrency: "unbounded" },
        );
        assert.include([firstId, secondId], first.userId);
        assert.deepEqual(second, first);

        const database = yield* Database.Service;
        assert.lengthOf(yield* database.select().from(users), 1);
        assert.lengthOf(yield* database.select().from(providerIdentities), 1);
      }),
    );
    it.effect("rejects another identity with the same email", () =>
      Effect.gen(function* () {
        const store = yield* IdentityStore.Service;
        yield* store.resolveOrCreate(account, firstId);
        assert.instanceOf(
          yield* store.resolveOrCreate(conflictingAccount, secondId).pipe(Effect.flip),
          IdentityStore.EmailTaken,
        );

        const database = yield* Database.Service;
        assert.lengthOf(yield* database.select().from(users), 1);
        assert.lengthOf(yield* database.select().from(providerIdentities), 1);
      }),
    );
  });
});
