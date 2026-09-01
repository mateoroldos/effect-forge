import { Context, Effect, Layer, Schema } from "effect";
import { HttpRouter } from "effect/unstable/http";

/** Executes Fetch requests against an API test graph. */
export class Service extends Context.Service<
  Service,
  (
    path: string,
    options?: {
      readonly method?: string;
      readonly body?: unknown;
      readonly headers?: Record<string, string>;
    },
  ) => Effect.Effect<Response, Schema.SchemaError>
>()("@effect-forge/api/ApiTest") {}

/** Provides an isolated Fetch handler for a complete API Layer. */
export const layer = <E>(apiLayer: Layer.Layer<never, E, HttpRouter.HttpRouter>) =>
  Layer.effect(
    Service,
    Effect.gen(function* () {
      const { handler, dispose } = HttpRouter.toWebHandler(apiLayer, { disableLogger: true });
      yield* Effect.addFinalizer(() => Effect.promise(dispose));

      return Service.of(
        Effect.fn("ApiTest.request")(function* (path, options) {
          const init: RequestInit = {
            method: options?.method ?? "GET",
            headers: { ...options?.headers },
          };

          if (options?.body !== undefined) {
            init.headers = { ...options?.headers, "content-type": "application/json" };
            init.body = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(
              options.body,
            );
          }

          return yield* Effect.promise(() =>
            handler(new Request(`http://effect-forge.test${path}`, init)),
          );
        }),
      );
    }),
  );

export * as ApiTest from "./api-test.ts";
