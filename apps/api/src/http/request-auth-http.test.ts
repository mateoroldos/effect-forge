import { assert, describe, it } from "@effect/vitest";
import { IdentityDirectory } from "@effect-forge/core/identity-directory";
import { IdentityStore } from "@effect-forge/core/identity-store";
import { ProviderAccount } from "@effect-forge/core/provider-account";
import { Principal } from "@effect-forge/domain/identity";
import { Effect, Layer, Option, Schema } from "effect";
import { HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { ApiTest } from "../test/api-test.ts";
import { IdentityHandlers } from "./identity-handlers.ts";
import { RequestAuth } from "./request-auth.ts";
import { ServerApi } from "./server-api.ts";

const account = Schema.decodeSync(ProviderAccount)({
  identity: { provider: "better-auth", subject: "provider-user-1" },
  email: "ada@example.com",
  name: "Ada Lovelace",
});
const principal = Schema.decodeSync(Principal)({
  userId: "550e8400-e29b-41d4-a716-446655440000",
  email: account.email,
  name: account.name,
});

const authenticated = Layer.succeed(RequestAuth.Authenticator, {
  identify: () => Effect.succeedSome(account),
});
const assertNoContent = Effect.fn("assertNoContent")(function* (
  response: Response,
  status: number,
) {
  assert.strictEqual(response.status, status);
  assert.strictEqual(yield* Effect.promise(() => response.text()), "");
});
const serve = (
  authenticator: Layer.Layer<RequestAuth.Authenticator>,
  identities: Layer.Layer<IdentityDirectory.Service>,
) =>
  ApiTest.layer(
    HttpApiBuilder.layer(ServerApi.Identity).pipe(
      Layer.provide(IdentityHandlers.layer),
      Layer.provide(RequestAuth.layer),
      Layer.provide(authenticator),
      Layer.provide(identities),
      Layer.provide(HttpServer.layerServices),
    ),
  );

const successLayer = serve(
  authenticated,
  Layer.succeed(IdentityDirectory.Service, { resolve: () => Effect.succeed(principal) }),
);
const anonymousLayer = serve(
  Layer.succeed(RequestAuth.Authenticator, {
    identify: () => Effect.succeed(Option.none()),
  }),
  Layer.succeed(IdentityDirectory.Service, {
    resolve: () => Effect.die("an anonymous request must not resolve an identity"),
  }),
);
const identificationFailureLayer = serve(
  Layer.succeed(RequestAuth.Authenticator, {
    identify: () =>
      Effect.fail(new RequestAuth.IdentificationFailed({ cause: "provider unavailable" })),
  }),
  Layer.succeed(IdentityDirectory.Service, {
    resolve: () => Effect.die("a failed identification must not resolve an identity"),
  }),
);
const emailTakenLayer = serve(
  authenticated,
  Layer.succeed(IdentityDirectory.Service, {
    resolve: () => Effect.fail(new IdentityStore.EmailTaken()),
  }),
);
const persistenceFailureLayer = serve(
  authenticated,
  Layer.succeed(IdentityDirectory.Service, {
    resolve: () =>
      Effect.fail(new IdentityStore.PersistenceError({ cause: "database unavailable" })),
  }),
);
const idFailureLayer = serve(
  authenticated,
  Layer.succeed(IdentityDirectory.Service, {
    resolve: () =>
      Effect.fail(new IdentityDirectory.IdGenerationError({ cause: "randomness unavailable" })),
  }),
);

describe("request authentication HTTP", () => {
  it.layer(successLayer)("resolved identity", (it) => {
    it.effect("returns the current principal", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/api/me");

        assert.strictEqual(response.status, 200);
        assert.deepEqual(
          yield* Schema.decodeUnknownEffect(Principal)(
            yield* Effect.promise(() => response.json()),
          ),
          principal,
        );
      }),
    );
  });

  it.layer(anonymousLayer)("anonymous request", (it) => {
    it.effect("projects to 401", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        yield* assertNoContent(yield* request("/api/me"), 401);
      }),
    );
  });

  it.layer(identificationFailureLayer)("authentication provider failure", (it) => {
    it.effect("projects to 500", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        yield* assertNoContent(yield* request("/api/me"), 500);
      }),
    );
  });

  it.layer(emailTakenLayer)("identity email conflict", (it) => {
    it.effect("projects to 409", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        yield* assertNoContent(yield* request("/api/me"), 409);
      }),
    );
  });

  it.layer(persistenceFailureLayer)("identity persistence failure", (it) => {
    it.effect("projects to 500", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        yield* assertNoContent(yield* request("/api/me"), 500);
      }),
    );
  });

  it.layer(idFailureLayer)("identity identifier failure", (it) => {
    it.effect("projects to 500", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        yield* assertNoContent(yield* request("/api/me"), 500);
      }),
    );
  });
});
