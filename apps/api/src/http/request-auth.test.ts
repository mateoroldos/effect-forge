import { Memory } from "@alchemy.run/better-auth";
import { assert, describe, it } from "@effect/vitest";
import { AuthBetter } from "@effect-forge/auth-better";
import { ProviderId } from "@effect-forge/core/provider-account";
import { CryptoDeterministic } from "@effect-forge/core/test/crypto-deterministic";
import { AppApi } from "@effect-forge/contracts";
import { PersistencePglite } from "@effect-forge/database-postgres/test/persistence-pglite";
import { Principal } from "@effect-forge/domain/identity";
import { Workspace } from "@effect-forge/domain/workspace";
import { RuntimeContext } from "alchemy";
import { Effect, Layer, Redacted, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { ApiTest } from "../test/api-test.ts";
import { App } from "./app.ts";
import { RequestAuth } from "./request-auth.ts";

const applicationRequirements = Layer.merge(CryptoDeterministic.layer, PersistencePglite.layer);

/** The Worker's composition, over an in-memory provider instead of Hyperdrive. */
const served = Layer.unwrap(
  Effect.gen(function* () {
    const provider = yield* AuthBetter.make({
      baseUrl: new URL("http://effect-forge.test"),
      basePath: AppApi.authBasePath,
      provider: ProviderId.make("better-auth"),
      secret: Redacted.make("test-secret-test-secret-test-secret"),
      trustedOrigins: ["http://effect-forge.test"],
      cookieDomain: null,
    });

    const authenticator = Layer.succeed(RequestAuth.Authenticator, {
      identify: (headers) =>
        provider.identify(headers).pipe(
          Effect.provide(RuntimeContext.phantom),
          Effect.mapError((cause) => new RequestAuth.IdentificationFailed({ cause })),
        ),
    });

    return Layer.merge(
      App.layer.pipe(Layer.provide(Layer.merge(applicationRequirements, authenticator))),
      HttpRouter.add(
        "*",
        `${AppApi.authBasePath}/*`,
        Effect.orDie(Effect.provide(provider.fetch, RuntimeContext.phantom)),
      ),
    ).pipe(Layer.provide(HttpServer.layerServices));
  }),
).pipe(Layer.provide(Layer.merge(Memory(), RuntimeContext.phantom)));

const testLayer = ApiTest.layer(served);

/** Signs a new account up through the provider's own routes and keeps its session cookie. */
const signUp = Effect.fn("signUp")(function* (email: string) {
  const request = yield* ApiTest.Service;
  const response = yield* request(`${AppApi.authBasePath}/sign-up/email`, {
    method: "POST",
    body: { email, password: "correct-horse-battery-staple", name: "Ada Lovelace" },
  });

  assert.strictEqual(response.status, 200);
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
});

describe("request authentication", () => {
  it.layer(testLayer)("session from the provider", (it) => {
    it.effect("resolves the principal the session belongs to", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const cookie = yield* signUp("ada@example.com");

        const response = yield* request("/me", { headers: { cookie } });

        assert.strictEqual(response.status, 200);
        const principal = yield* Schema.decodeUnknownEffect(Principal)(
          yield* Effect.promise(() => response.json()),
        );
        assert.strictEqual(principal.email, "ada@example.com");
      }),
    );

    it.effect("scopes workspaces to that principal", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const cookie = yield* signUp("grace@example.com");

        const created = yield* request("/workspaces", {
          method: "POST",
          body: { name: "Effect Forge" },
          headers: { cookie },
        });
        assert.strictEqual(created.status, 201);

        const listed = yield* request("/workspaces", { headers: { cookie } });
        assert.strictEqual(listed.status, 200);
        const workspaces = yield* Schema.decodeUnknownEffect(Schema.Array(Workspace))(
          yield* Effect.promise(() => listed.json()),
        );
        assert.lengthOf(workspaces, 1);
      }),
    );
  });

  it.layer(testLayer)("no session", (it) => {
    it.effect("serves public health without authentication", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        assert.strictEqual((yield* request("/health")).status, 200);
      }),
    );

    it.effect("rejects an authenticated endpoint", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        assert.strictEqual((yield* request("/me")).status, 401);
      }),
    );
  });
});
