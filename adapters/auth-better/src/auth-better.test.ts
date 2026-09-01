import { assert, describe, it } from "@effect/vitest";
import { Memory } from "@alchemy.run/better-auth";
import { ProviderId } from "@effect-forge/core/provider-account";
import { RuntimeContext } from "alchemy";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { AuthBetter } from "./auth-better.ts";

const serve = (fetch: AuthBetter.Instance["fetch"], request: Request) =>
  fetch.pipe(
    Effect.provideService(HttpServerRequest.HttpServerRequest, HttpServerRequest.fromWeb(request)),
    Effect.map(HttpServerResponse.toWeb),
  );

const makeAdapter = (cookieDomain: string | null = null) =>
  AuthBetter.make({
    basePath: "/auth",
    provider: ProviderId.make("better-auth"),
    secret: Redacted.make("test-secret-test-secret-test-secret"),
    trustedOrigins: ["http://localhost"],
    cookieDomain,
  });

const signUp = (adapter: AuthBetter.Instance, email: string) =>
  Effect.gen(function* () {
    const body = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({
      email,
      password: "correct-horse-battery-staple",
      name: "Ada Lovelace",
    });
    return yield* serve(
      adapter.fetch,
      new Request("http://localhost/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
  });

const testLayer = Layer.merge(Memory(), RuntimeContext.phantom);

describe("AuthBetter", () => {
  it.live("identifies a cookie-authenticated provider account", () =>
    Effect.gen(function* () {
      const adapter = yield* makeAdapter();
      const response = yield* signUp(adapter, "ada@example.com");

      assert.strictEqual(response.status, 200);
      const cookie = response.headers
        .getSetCookie()
        .map((value) => value.split(";")[0])
        .join("; ");
      const identified = yield* adapter.identify(new Headers({ cookie }));

      assert.isTrue(Option.isSome(identified));
      if (Option.isSome(identified)) {
        assert.deepEqual(identified.value, {
          identity: {
            provider: "better-auth",
            subject: identified.value.identity.subject,
          },
          email: "ada@example.com",
          name: "Ada Lovelace",
        });
        assert.isNotEmpty(identified.value.identity.subject);
      }
    }).pipe(Effect.provide(testLayer), Effect.scoped),
  );

  it.live("keeps requests without a session anonymous", () =>
    Effect.gen(function* () {
      const adapter = yield* makeAdapter();
      assert.isTrue(Option.isNone(yield* adapter.identify(new Headers())));
    }).pipe(Effect.provide(testLayer), Effect.scoped),
  );

  it.live("sends cross-site cookies when no parent domain is shared", () =>
    Effect.gen(function* () {
      const adapter = yield* makeAdapter();
      const response = yield* signUp(adapter, "grace@example.com");

      assert.isTrue(
        response.headers
          .getSetCookie()
          .every((value) => /;\s*samesite=none/i.test(value) && /;\s*secure/i.test(value)),
        "cookies must survive a cross-site request",
      );
    }).pipe(Effect.provide(testLayer), Effect.scoped),
  );

  it.live("scopes cookies to the shared parent domain when there is one", () =>
    Effect.gen(function* () {
      const adapter = yield* makeAdapter("effect-forge.test");
      const response = yield* signUp(adapter, "alan@example.com");

      assert.isTrue(
        response.headers
          .getSetCookie()
          .every(
            (value) =>
              /;\s*domain=effect-forge\.test/i.test(value) && /;\s*samesite=lax/i.test(value),
          ),
        "cookies must stay first-party across the shared domain",
      );
    }).pipe(Effect.provide(testLayer), Effect.scoped),
  );
});
