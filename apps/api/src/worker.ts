import { CloudflareHyperdrive } from "@alchemy.run/better-auth/CloudflareHyperdrive";
import { AppApi } from "@effect-forge/contracts";
import { AuthBetter } from "@effect-forge/auth-better";
import { ProviderId } from "@effect-forge/core/provider-account";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import { NodeCrypto } from "@effect/platform-node";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as SQL from "alchemy/SQL/Postgres";
import { Config, Effect, Layer, Option } from "effect";
import { HttpMiddleware, HttpRouter } from "effect/unstable/http";
import { App } from "./http/app.ts";
import { RequestAuth } from "./http/request-auth.ts";
import { Database } from "./infrastructure/database.ts";
import { Telemetry } from "./infrastructure/telemetry.ts";

/** The registered domain production is served from. */
const rootDomain = "effect-forge.com";

/** The production hostname of this API. */
const apiDomain = `api.${rootDomain}`;

/** The production hostname of the web application, which this API trusts. */
export const webDomain = `app.${rootDomain}`;

/** Hosts other stages are reached at, which Cloudflare assigns per deploy. */
const derivedHosts = ["*.workers.dev", "localhost", "localhost:*", "127.0.0.1:*"];

/** Whether a browser origin belongs to a stage whose hostname the stack cannot know. */
const isDerivedOrigin = (origin: string) => {
  if (!URL.canParse(origin)) return false;
  const { protocol, hostname } = new URL(origin);

  if (protocol === "http:") return hostname === "localhost" || hostname === "127.0.0.1";
  return protocol === "https:" && hostname.endsWith(".workers.dev");
};

/** What production pins; absent everywhere else, where hostnames are matched by shape. */
const config = Config.all({
  apiUrl: Config.option(Config.url("AUTH_BASE_URL")),
  cookieDomain: Config.option(Config.nonEmptyString("AUTH_COOKIE_DOMAIN")),
  webOrigin: Config.option(Config.nonEmptyString("WEB_ORIGIN")),
});

export default class ApiWorker extends Cloudflare.Worker<ApiWorker>()(
  "ApiWorker",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const production = stage === "prod";

    return {
      main: import.meta.url,
      domain: production ? apiDomain : null,
      env: production
        ? {
            AUTH_BASE_URL: `https://${apiDomain}`,
            AUTH_COOKIE_DOMAIN: rootDomain,
            WEB_ORIGIN: `https://${webDomain}`,
          }
        : {},
      compatibility: { flags: ["nodejs_compat"] },
      observability: { enabled: true },
    };
  }),
  Effect.gen(function* () {
    const { apiUrl, cookieDomain, webOrigin } = yield* config;
    const runtime = yield* Cloudflare.Worker;
    const hyperdrive = yield* Cloudflare.Hyperdrive.Connect(Database.hyperdrive);
    const originUrl = yield* Database.originUrl;
    const postgresLayer = SQL.PostgresLayer({ url: hyperdrive.connectionString });
    const persistenceLayer = PersistencePostgres.layer.pipe(Layer.provide(postgresLayer));
    const betterAuth = yield* AuthBetter.make({
      baseUrl: Option.getOrElse(apiUrl, () => ({ allowedHosts: derivedHosts })),
      basePath: AppApi.authBasePath,
      provider: ProviderId.make("better-auth"),
      secret: null,
      trustedOrigins: Option.match(webOrigin, {
        onNone: () => derivedHosts,
        onSome: (origin) => [origin],
      }),
      cookieDomain: Option.getOrNull(cookieDomain),
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
      fetch: httpApp.pipe(
        HttpMiddleware.cors({
          allowedOrigins: Option.match(webOrigin, {
            onNone: () => isDerivedOrigin,
            onSome: (origin) => [origin],
          }),
          credentials: true,
        }),
      ),
    };
  }).pipe(Effect.provide(Layer.merge(Cloudflare.Hyperdrive.ConnectBinding, Telemetry.layer))),
) {}
