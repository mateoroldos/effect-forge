import { AppApi } from "@effect-forge/contracts";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { CryptoTest } from "@effect-forge/core/test/crypto";
import { DatabasePglite } from "@effect-forge/database/test/database-pglite";
import { WorkspaceStorePostgres } from "@effect-forge/database/workspace-store-postgres";
import { Context, Effect, Layer, Schema } from "effect";
import { HttpRouter, HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { WorkspacesHttp } from "../http/workspaces.ts";

const storeLayer = WorkspaceStorePostgres.layer.pipe(Layer.provide(DatabasePglite.layer));
const directoryLayer = WorkspaceDirectory.layerWithoutDependencies.pipe(
  Layer.provide(Layer.merge(CryptoTest.layer, storeLayer)),
);
const handlerLayer = WorkspacesHttp.layer.pipe(Layer.provide(directoryLayer));
const apiLayer = HttpApiBuilder.layer(AppApi.Api).pipe(
  Layer.provide(handlerLayer),
  Layer.provide(HttpServer.layerServices),
);

/** Executes Fetch requests against the workspace API test graph. */
export class Service extends Context.Service<
  Service,
  (
    path: string,
    options?: { readonly method?: string; readonly body?: unknown },
  ) => Effect.Effect<Response, Schema.SchemaError>
>()("@effect-forge/api/ApiTest") {}

/** Provides an isolated Fetch handler backed by migrated PGlite. */
export const layer = Layer.effect(
  Service,
  Effect.acquireRelease(
    Effect.sync(() => HttpRouter.toWebHandler(apiLayer, { disableLogger: true })),
    ({ dispose }) => Effect.promise(dispose),
  ).pipe(
    Effect.map(({ handler }) =>
      Service.of(
        Effect.fn(function* (path, options) {
          const init: RequestInit = { method: options?.method ?? "GET" };

          if (options?.body !== undefined) {
            init.headers = { "content-type": "application/json" };
            init.body = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(
              options.body,
            );
          }

          return yield* Effect.promise(() =>
            handler(new Request(`http://effect-forge.test${path}`, init)),
          );
        }),
      ),
    ),
  ),
);

export * as ApiTest from "./api-test.ts";
