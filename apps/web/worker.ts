import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Config, Context, Effect, Option } from "effect";
import { fileURLToPath } from "node:url";
import { stageHostFor } from "../../infra/stage.ts";

const webRoot = fileURLToPath(new URL(".", import.meta.url));

/** Deployment input selected by the Stack that composes the peer Workers. */
export class ApiBinding extends Context.Service<ApiBinding, Cloudflare.Worker>()(
  "@effect-forge/web/ApiBinding",
) {}

export class WebWorker extends Cloudflare.Website.SvelteKit<WebWorker>()(
  "Web",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const stageHost = stageHostFor(stage);
    const browserTelemetryEnv = yield* resolveBrowserTelemetryEnv(stage).pipe(Effect.orDie);
    const api = yield* ApiBinding;

    return {
      rootDir: webRoot,
      memo: {
        include: ["**/*", "../../packages/contracts/src/**", "../../packages/domain/src/**"],
        lockfile: true,
      },
      env: {
        API: api,
        SEARCH_INDEXABLE: String(stage === "prod"),
        ...browserTelemetryEnv,
      },
      domain: stageHost?.hostname ?? null,
      compatibility: {
        flags: ["nodejs_compat", "enable_request_signal"],
      },
      observability: { enabled: true },
    };
  }),
) {}

export type WebWorkerEnv = Cloudflare.InferEnv<typeof WebWorker>;

const resolveBrowserTelemetryEnv = (stage: string) =>
  Effect.gen(function* () {
    const enabled = yield* Config.boolean("TELEMETRY_ENABLED").pipe(Config.withDefault(false));
    if (!enabled) return { VITE_TELEMETRY_ENABLED: "false" };

    const endpoint = yield* Config.url("MAPLE_ENDPOINT").pipe(
      Config.withDefault(
        new URL(stage.startsWith("dev_") ? "http://127.0.0.1:4318" : "https://ingest.maple.dev"),
      ),
    );
    const local = ["127.0.0.1", "::1", "[::1]", "localhost"].includes(endpoint.hostname);
    const ingestKey = local
      ? yield* Config.option(Config.string("MAPLE_BROWSER_INGEST_KEY"))
      : Option.some(yield* Config.string("MAPLE_BROWSER_INGEST_KEY"));

    return Option.match(ingestKey, {
      onNone: () => ({
        VITE_TELEMETRY_ENABLED: "true",
        VITE_MAPLE_ENDPOINT: endpoint.toString(),
      }),
      onSome: (key) => ({
        VITE_TELEMETRY_ENABLED: "true",
        VITE_MAPLE_ENDPOINT: endpoint.toString(),
        VITE_MAPLE_INGEST_KEY: key,
      }),
    });
  });
