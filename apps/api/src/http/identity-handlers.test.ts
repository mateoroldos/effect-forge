import { assert, describe, it } from "@effect/vitest";
import { Principal } from "@effect-forge/domain/identity";
import { Effect, Layer, Schema } from "effect";
import { HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { ApiTest } from "../test/api-test.ts";
import { authenticatedAs } from "../test/authenticated-as.ts";
import { IdentityHandlers } from "./identity-handlers.ts";
import { ServerApi } from "./server-api.ts";

const principal = Schema.decodeSync(Principal)({
  userId: "550e8400-e29b-41d4-a716-446655440000",
  email: "ada@example.com",
  name: "Ada Lovelace",
});
const testLayer = ApiTest.layer(
  HttpApiBuilder.layer(ServerApi.Identity).pipe(
    Layer.provide(IdentityHandlers.layer),
    Layer.provide(authenticatedAs(principal)),
    Layer.provide(HttpServer.layerServices),
  ),
);

describe("identity HTTP API", () => {
  it.layer(testLayer)("authenticated principal", (it) => {
    it.effect("returns 200 and the request principal", () =>
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
});
