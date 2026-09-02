import { assert, describe, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { ApiTest } from "../test/api-test.ts";
import { HealthHandlers } from "./health-handlers.ts";
import { ServerApi } from "./server-api.ts";

const testLayer = ApiTest.layer(
  HttpApiBuilder.layer(ServerApi.Health).pipe(
    Layer.provide(HealthHandlers.layer),
    Layer.provide(HttpServer.layerServices),
  ),
);

describe("health HTTP API", () => {
  it.layer(testLayer)("public liveness", (it) => {
    it.effect("returns 200", () =>
      Effect.gen(function* () {
        const request = yield* ApiTest.Service;
        const response = yield* request("/health");

        assert.strictEqual(response.status, 200);
        assert.deepEqual(yield* Effect.promise(() => response.json()), { status: "ok" });
      }),
    );
  });
});
