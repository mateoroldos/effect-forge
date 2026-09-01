import { CloudflareHyperdrive } from "@alchemy.run/better-auth/CloudflareHyperdrive";
import { AppApi } from "@effect-forge/contracts";
import { AuthBetter } from "@effect-forge/auth-better";
import { ProviderId } from "@effect-forge/core/provider-account";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import { NodeCrypto } from "@effect/platform-node";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as SQL from "alchemy/SQL/Postgres";
import { Config, Effect, Layer, Option, Schema } from "effect";
import { HttpMiddleware, HttpRouter } from "effect/unstable/http";
import { App } from "./http/app.ts";
import { RequestAuth } from "./http/request-auth.ts";
import { Database } from "./infrastructure/database.ts";
import { Telemetry } from "./infrastructure/telemetry.ts";

/** Everything the stack must bind, yielded by both effects so they cannot drift. */
const config = Config.all({
  /** Signs and verifies Better Auth sessions. */
  authSecret: Config.redacted("AUTH_SECRET"),
  /** The browser origins allowed to call this API with session cookies. */
  webOrigins: Config.schema(Config.Array(Schema.NonEmptyString), "WEB_ORIGINS"),
  /** The parent domain the web app shares with this API, where a stage has one. */
  cookieDomain: Config.option(Config.nonEmptyString("COOKIE_DOMAIN")),
});

export default class ApiWorker extends Cloudflare.Worker<ApiWorker>()(
  "ApiWorker",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    yield* config;

    return {
      main: import.meta.url,
      domain: stage === "prod" ? "api.effect-forge.com" : null,
      compatibility: { flags: ["nodejs_compat"] },
      observability: { enabled: true },
    };
  }),
  Effect.gen(function* () {
    const { authSecret, cookieDomain, webOrigins } = yield* config;
    const runtime = yield* Cloudflare.Worker;
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Database.hyperdrive);
    const postgresLayer = SQL.PostgresLayer({ url: hyperdrive.connectionString });
    const persistenceLayer = PersistencePostgres.layer.pipe(Layer.provide(postgresLayer));
    const betterAuth = yield* AuthBetter.make({
      basePath: AppApi.authBasePath,
      provider: ProviderId.make("better-auth"),
      secret: authSecret,
      trustedOrigins: webOrigins,
      cookieDomain: Option.getOrNull(cookieDomain),
    }).pipe(Effect.provide(CloudflareHyperdrive(Database.hyperdrive)));

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
      fetch: httpApp.pipe(HttpMiddleware.cors({ allowedOrigins: webOrigins, credentials: true })),
    };
  }).pipe(Effect.provide(Layer.merge(Cloudflare.Hyperdrive.ConnectBinding, Telemetry.layer))),
) {}
