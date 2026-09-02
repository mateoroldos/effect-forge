import { CloudflareHyperdrive } from "@alchemy.run/better-auth/CloudflareHyperdrive";
import { AppApi } from "@effect-forge/contracts";
import { AuthBetter } from "@effect-forge/auth-better";
import { ProviderId } from "@effect-forge/core/provider-account";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import { NodeCrypto } from "@effect/platform-node";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as SQL from "alchemy/SQL/Postgres";
import { Effect, Layer } from "effect";
import { HttpMiddleware, HttpRouter } from "effect/unstable/http";
import { stageHostFor, zoneName } from "../../../stacks/stage-host.ts";
import { App } from "./http/app.ts";
import { RequestAuth } from "./http/request-auth.ts";
import { Database } from "./infrastructure/database.ts";
import { Telemetry } from "./infrastructure/telemetry.ts";

/** Hosts local development is reached at, which no stage assigns. */
const localHosts = ["localhost", "localhost:*", "127.0.0.1:*"];

/** Whether a browser origin is a local development server. */
const isLocalOrigin = (origin: string) => {
  if (!URL.canParse(origin)) return false;
  const { protocol, hostname } = new URL(origin);

  return protocol === "http:" && (hostname === "localhost" || hostname === "127.0.0.1");
};

export default class ApiWorker extends Cloudflare.Worker<ApiWorker>()(
  "ApiWorker",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const stageHost = stageHostFor(stage);

    return {
      main: import.meta.url,
      workersDev: stageHost === null,
      routes:
        stageHost === null
          ? []
          : [{ pattern: `${stageHost.hostname}${AppApi.apiBasePath}/*`, zoneName }],
      compatibility: { flags: ["nodejs_compat"] },
      observability: { enabled: true },
    };
  }),
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const stageHost = stageHostFor(stage);
    const runtime = yield* Cloudflare.Worker;
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Database.hyperdrive);
    const originUrl = yield* Database.originUrl;
    const postgresLayer = SQL.PostgresLayer({ url: hyperdrive.connectionString });
    const persistenceLayer = PersistencePostgres.layer.pipe(Layer.provide(postgresLayer));
    const betterAuth = yield* AuthBetter.make({
      baseUrl: stageHost === null ? { allowedHosts: localHosts } : new URL(stageHost.origin),
      basePath: AppApi.authBasePath,
      provider: ProviderId.make("better-auth"),
      secret: null,
      trustedOrigins: stageHost === null ? localHosts : [stageHost.origin],
      secure: stageHost !== null,
    }).pipe(Effect.provide(CloudflareHyperdrive(Database.hyperdrive, { migrate: originUrl })));

    const authenticatorLayer = Layer.succeed(RequestAuth.Authenticator, {
      identify: (headers) =>
        betterAuth.identify(headers).pipe(
          Effect.provideService(Alchemy.RuntimeContext, runtime),
          Effect.mapError((cause) => new RequestAuth.IdentificationFailed({ cause })),
        ),
    });

    const routerLayer = Layer.merge(
      App.layer.pipe(
        Layer.provide(Layer.mergeAll(NodeCrypto.layer, persistenceLayer, authenticatorLayer)),
      ),
      HttpRouter.add(
        "*",
        `${AppApi.authBasePath}/*`,
        Effect.provideService(betterAuth.fetch, Alchemy.RuntimeContext, runtime),
      ),
    );
    const httpApp = yield* HttpRouter.toHttpEffect(routerLayer);

    return {
      fetch:
        stageHost === null
          ? httpApp.pipe(HttpMiddleware.cors({ allowedOrigins: isLocalOrigin, credentials: true }))
          : httpApp,
    };
  }).pipe(Effect.provide(Layer.merge(Cloudflare.Hyperdrive.ConnectBinding, Telemetry.layer))),
) {}
