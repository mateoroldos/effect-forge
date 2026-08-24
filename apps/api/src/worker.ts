import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { DatabasePostgres } from "@effect-forge/database/postgres";
import { WorkspaceStorePostgres } from "@effect-forge/database/workspace-store-postgres";
import { NodeCrypto } from "@effect/platform-node";
import * as Cloudflare from "alchemy/Cloudflare";
import * as SQL from "alchemy/SQL/Postgres";
import { Effect, Layer } from "effect";
import { HttpRouter } from "effect/unstable/http";
import { App } from "./app.ts";
import { Database } from "./database.ts";

export default class ApiWorker extends Cloudflare.Worker<ApiWorker>()(
  "ApiWorker",
  {
    main: import.meta.url,
    compatibility: { flags: ["nodejs_compat"] },
    observability: { enabled: true },
  },
  Effect.gen(function* () {
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Database.hyperdrive);
    const postgresLayer = SQL.PostgresLayer({ url: hyperdrive.connectionString });
    const databaseLayer = DatabasePostgres.layer.pipe(Layer.provide(postgresLayer));
    const storeLayer = WorkspaceStorePostgres.layer.pipe(Layer.provide(databaseLayer));
    const directoryLayer = WorkspaceDirectory.layerWithoutDependencies.pipe(
      Layer.provide(Layer.merge(NodeCrypto.layer, storeLayer)),
    );
    const apiLayer = App.layerWithoutDependencies.pipe(Layer.provide(directoryLayer));

    return {
      fetch: yield* HttpRouter.toHttpEffect(apiLayer),
    };
  }).pipe(Effect.provide(Cloudflare.Hyperdrive.ConnectBinding)),
) {}
