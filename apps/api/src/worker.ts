import { AuthBetter } from "@effect-forge/auth-better";
import { Auth } from "@effect-forge/core/auth";
import { IdentitySourceId } from "@effect-forge/core/provider-account";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import { NodeCrypto } from "@effect/platform-node";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as SQL from "alchemy/SQL/Postgres";
import { Config, Effect, Layer } from "effect";
import { HttpMiddleware, HttpRouter } from "effect/unstable/http";
import { App } from "./app.ts";
import { Database } from "./infrastructure/database.ts";
import { Telemetry } from "./infrastructure/telemetry.ts";

const authBasePath = "/auth";

export default class ApiWorker extends Cloudflare.Worker<ApiWorker>()(
  "ApiWorker",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    yield* Config.redacted("AUTH_SECRET");

    return {
      main: import.meta.url,
      domain: stage === "prod" ? "api.effect-forge.com" : null,
      compatibility: { flags: ["nodejs_compat"] },
      observability: { enabled: true },
    };
  }),
  Effect.gen(function* () {
    const runtime = yield* Cloudflare.Worker;
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Database.hyperdrive);
    const postgresLayer = SQL.PostgresLayer({ url: hyperdrive.connectionString });
    const storeLayer = PersistencePostgres.layer.pipe(Layer.provide(postgresLayer));
    const applicationLayer = Layer.merge(
      Auth.layerWithoutDependencies,
      WorkspaceDirectory.layerWithoutDependencies,
    ).pipe(Layer.provide(Layer.merge(NodeCrypto.layer, storeLayer)));
    const betterAuth = yield* AuthBetter.makeWithHyperdrive(
      {
        basePath: authBasePath,
        identitySource: IdentitySourceId.make("better-auth"),
        secret: yield* Config.redacted("AUTH_SECRET"),
      },
      Database.hyperdrive,
    );

    const onRuntime = <A, E, R>(effect: Effect.Effect<A, E, R | Alchemy.RuntimeContext>) =>
      Effect.provideService(effect, Alchemy.RuntimeContext, runtime);

    const routerLayer = Layer.merge(
      App.layer({ identify: (headers) => onRuntime(betterAuth.identify(headers)) }).pipe(
        Layer.provide(applicationLayer),
      ),
      HttpRouter.add("*", `${authBasePath}/*`, onRuntime(betterAuth.fetch)),
    );
    const httpApp = yield* HttpRouter.toHttpEffect(routerLayer);

    return {
      fetch: httpApp.pipe(HttpMiddleware.cors()),
    };
  }).pipe(Effect.provide(Layer.merge(Cloudflare.Hyperdrive.ConnectBinding, Telemetry.layer))),
) {}
