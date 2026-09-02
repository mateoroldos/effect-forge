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

/** The complete HTTP application with deterministic local infrastructure. */
const served = Layer.unwrap(
  Effect.gen(function* () {
    const provider = yield* AuthBetter.make({
      baseUrl: new URL("http://effect-forge.test"),
      basePath: AppApi.authBasePath,
      provider: ProviderId.make("better-auth"),
      secret: Redacted.make("test-secret-test-secret-test-secret"),
      trustedOrigins: ["http://effect-forge.test"],
      secure: true,
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

describe("application HTTP integration", () => {
  it.layer(testLayer)("provider session provisioning", (it) => {
    it.effect(
      "resolves the session's application principal",
      () =>
        Effect.gen(function* () {
          const request = yield* ApiTest.Service;
          const cookie = yield* signUp("ada@example.com");

          const response = yield* request("/api/me", { headers: { cookie } });

          assert.strictEqual(response.status, 200);
          const principal = yield* Schema.decodeUnknownEffect(Principal)(
            yield* Effect.promise(() => response.json()),
          );
          assert.strictEqual(principal.email, "ada@example.com");
        }),
      15_000,
    );
  });

  it.layer(testLayer)("workspace isolation", (it) => {
    it.effect(
      "shows a workspace only to its owning principal",
      () =>
        Effect.gen(function* () {
          const request = yield* ApiTest.Service;
          const ownerCookie = yield* signUp("grace@example.com");
          const otherCookie = yield* signUp("ada@example.com");

          const created = yield* request("/api/workspaces", {
            method: "POST",
            body: { name: "Effect Forge" },
            headers: { cookie: ownerCookie },
          });
          assert.strictEqual(created.status, 201);

          const ownerResponse = yield* request("/api/workspaces", {
            headers: { cookie: ownerCookie },
          });
          assert.strictEqual(ownerResponse.status, 200);
          const ownerWorkspaces = yield* Schema.decodeUnknownEffect(Schema.Array(Workspace))(
            yield* Effect.promise(() => ownerResponse.json()),
          );
          assert.lengthOf(ownerWorkspaces, 1);

          const otherResponse = yield* request("/api/workspaces", {
            headers: { cookie: otherCookie },
          });
          assert.strictEqual(otherResponse.status, 200);
          const otherWorkspaces = yield* Schema.decodeUnknownEffect(Schema.Array(Workspace))(
            yield* Effect.promise(() => otherResponse.json()),
          );
          assert.lengthOf(otherWorkspaces, 0);
        }),
      15_000,
    );
  });

  it.layer(testLayer)("anonymous route policy", (it) => {
    it.effect("keeps public health accessible", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        assert.strictEqual((yield* request("/api/health")).status, 200);
      }),
    );

    it.effect("requires a session for every principal-owned route group", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        assert.strictEqual((yield* request("/api/me")).status, 401);
        assert.strictEqual((yield* request("/api/workspaces")).status, 401);
      }),
    );
  });
});
