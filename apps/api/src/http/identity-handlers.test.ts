import { assert, describe, it } from "@effect/vitest";
import { IdentityDirectory } from "@effect-forge/core/identity-directory";
import { ProviderAccount } from "@effect-forge/core/provider-account";
import { CryptoDeterministic } from "@effect-forge/core/test/crypto-deterministic";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { PersistencePglite } from "@effect-forge/database-postgres/test/persistence-pglite";
import { Principal } from "@effect-forge/domain/identity";
import { Effect, Layer, Option, Schema } from "effect";
import { ApiTest } from "../test/api-test.ts";
import { App } from "./app.ts";
import { RequestAuth } from "./request-auth.ts";

const subject = "provider-subject-1";
const account = Schema.decodeSync(ProviderAccount)({
  identity: { provider: "test", subject },
  email: "ada@example.com",
  name: "Ada Lovelace",
});
const storeLayer = PersistencePglite.layer;
const coreLayer = Layer.mergeAll(IdentityDirectory.layer, WorkspaceDirectory.layer).pipe(
  Layer.provide(Layer.merge(CryptoDeterministic.layer, storeLayer)),
);
const signedIn = Layer.succeed(RequestAuth.Authenticator, {
  identify: () => Effect.succeedSome(account),
});
const signedOut = Layer.succeed(RequestAuth.Authenticator, {
  identify: () => Effect.succeed(Option.none()),
});
const serve = (authenticator: typeof signedIn) =>
  ApiTest.layer(App.layer.pipe(Layer.provide(Layer.merge(coreLayer, authenticator))));

const testLayer = serve(signedIn);
const anonymousLayer = serve(signedOut);

describe("identity HTTP API", () => {
  it.layer(anonymousLayer)("anonymous request", (it) => {
    it.effect("returns 401", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        assert.strictEqual((yield* request("/me")).status, 401);
      }),
    );
  });

  it.layer(testLayer)("authenticated request", (it) => {
    it.effect("returns 200 and the application principal", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/me");

        assert.strictEqual(response.status, 200);
        const principal = yield* Schema.decodeUnknownEffect(Principal)(
          yield* Effect.promise(() => response.json()),
        );

        assert.strictEqual(principal.email, "ada@example.com");
        assert.strictEqual(principal.name, "Ada Lovelace");
        assert.notStrictEqual(principal.userId, subject);
      }),
    );
  });
});
