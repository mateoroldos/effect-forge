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

/** Executes Fetch requests against the workspace API test graph. */
export class Service extends Context.Service<
  Service,
  (
    path: string,
    options?: { readonly method?: string; readonly body?: unknown },
  ) => Effect.Effect<Response, Schema.SchemaError>
>()("@effect-forge/api/ApiTest") {}

const makeLayer = (providedDirectoryLayer: typeof directoryLayer) => {
  const handlerLayer = WorkspacesHttp.layer.pipe(Layer.provide(providedDirectoryLayer));
  const apiLayer = HttpApiBuilder.layer(AppApi.Api).pipe(
    Layer.provide(handlerLayer),
    Layer.provide(HttpServer.layerServices),
  );

  return Layer.effect(
    Service,
    Effect.gen(function* () {
      const { handler, dispose } = HttpRouter.toWebHandler(apiLayer, { disableLogger: true });
      yield* Effect.addFinalizer(() => Effect.promise(dispose));

      return Service.of(
        Effect.fn("ApiTest.request")(function* (path, options) {
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
      );
    }),
  );
};

/** Provides an isolated Fetch handler backed by migrated PGlite. */
export const layer = makeLayer(directoryLayer);

/** Provides an isolated Fetch handler with a substitute workspace directory. */
export const layerWithDirectory = (directory: WorkspaceDirectory.Interface) =>
  makeLayer(Layer.succeed(WorkspaceDirectory.Service, directory));

export * as ApiTest from "./api-test.ts";
