import { assert, describe, it } from "@effect/vitest";
import { Memory } from "@alchemy.run/better-auth";
import { IdentitySourceId } from "@effect-forge/core/provider-account";
import { RuntimeContext } from "alchemy";
import { Effect, Layer, Option, Redacted, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/unstable/http";
import { AuthBetter } from "./auth-better.ts";

const serve = (fetch: AuthBetter.Instance["fetch"], request: Request) =>
  fetch.pipe(
    Effect.provideService(HttpServerRequest.HttpServerRequest, HttpServerRequest.fromWeb(request)),
    Effect.map(HttpServerResponse.toWeb),
  );

const makeAdapter = AuthBetter.make({
  basePath: "/auth",
  identitySource: IdentitySourceId.make("better-auth"),
  secret: Redacted.make("test-secret-test-secret-test-secret"),
});

const testLayer = Layer.merge(Memory(), RuntimeContext.phantom);

describe("AuthBetter", () => {
  it.live("identifies a cookie-authenticated provider account", () =>
    Effect.gen(function* () {
      const adapter = yield* makeAdapter;
      const body = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))({
        email: "ada@example.com",
        password: "correct-horse-battery-staple",
        name: "Ada Lovelace",
      });
      const response = yield* serve(
        adapter.fetch,
        new Request("http://localhost/auth/sign-up/email", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body,
        }),
      );

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
            source: "better-auth",
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
      const adapter = yield* makeAdapter;
      assert.isTrue(Option.isNone(yield* adapter.identify(new Headers())));
    }).pipe(Effect.provide(testLayer), Effect.scoped),
  );
});
