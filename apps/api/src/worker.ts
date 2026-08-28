import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import { NodeCrypto } from "@effect/platform-node";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as SQL from "alchemy/SQL/Postgres";
import { Effect, Layer } from "effect";
import { HttpMiddleware, HttpRouter } from "effect/unstable/http";
import { App } from "./app.ts";
import { Database } from "./infrastructure/database.ts";
import { Telemetry } from "./infrastructure/telemetry.ts";

export default class ApiWorker extends Cloudflare.Worker<ApiWorker>()(
  "ApiWorker",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;

    return {
      main: import.meta.url,
      domain: stage === "prod" ? "api.effect-forge.com" : null,
      compatibility: { flags: ["nodejs_compat"] },
      observability: { enabled: true },
    };
  }),
  Effect.gen(function* () {
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Database.hyperdrive);
    const postgresLayer = SQL.PostgresLayer({ url: hyperdrive.connectionString });
    const storeLayer = PersistencePostgres.layer.pipe(Layer.provide(postgresLayer));
    const directoryLayer = WorkspaceDirectory.layerWithoutDependencies.pipe(
      Layer.provide(Layer.merge(NodeCrypto.layer, storeLayer)),
    );
    const apiLayer = App.layerWithoutDependencies.pipe(Layer.provide(directoryLayer));

    const httpApp = yield* HttpRouter.toHttpEffect(apiLayer);

    return {
      fetch: httpApp.pipe(HttpMiddleware.cors()),
    };
  }).pipe(Effect.provide(Layer.merge(Cloudflare.Hyperdrive.ConnectBinding, Telemetry.layer))),
) {}
