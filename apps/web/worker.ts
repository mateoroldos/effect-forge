import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Config, Effect, Option } from "effect";
import { fileURLToPath } from "node:url";
import { stageHostFor } from "../../infra/stage.ts";
import { Database } from "../../infra/database.ts";
import { Observability } from "./src/lib/server/observability.ts";

const webRoot = fileURLToPath(new URL(".", import.meta.url));

export default class WebWorker extends Cloudflare.Website.SvelteKit<WebWorker>()(
  "Web",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const stageHost = stageHostFor(stage);
    const database = yield* Database.hyperdrive;
    const authSecret = yield* Alchemy.Random("ApplicationAuthSecret");
    const endpoint = yield* Config.schema(
      Observability.CollectorEndpoint,
      "OTEL_EXPORTER_OTLP_ENDPOINT",
    ).pipe(Config.option, Effect.orDie);

    return {
      rootDir: webRoot,
      env: {
        AUTH_ORIGIN: Cloudflare.Worker.URL,
        AUTH_SECRET: authSecret.text,
        DATABASE: database,
        SEARCH_INDEXABLE: String(stage === "prod"),
        DEPLOYMENT_ENVIRONMENT: stage,
        ...Option.match(endpoint, {
          onNone: () => ({}),
          onSome: (url) => ({ OTEL_EXPORTER_OTLP_ENDPOINT: url.href }),
        }),
      },
      domain: stageHost?.hostname ?? null,
      workersDev: stageHost === null,
      compatibility: {
        flags: ["nodejs_compat", "enable_request_signal"],
      },
      observability: { enabled: true, traces: { enabled: true } },
    };
  }),
) {}

export type WebWorkerEnv = Cloudflare.InferEnv<typeof WebWorker>;
