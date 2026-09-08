import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Context, Effect } from "effect";
import { fileURLToPath } from "node:url";
import { stageHostFor } from "../../infra/stage.ts";
import { Database } from "../../infra/database.ts";

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
    const api = yield* ApiBinding;
    const database = yield* Database.hyperdrive;

    return {
      rootDir: webRoot,
      env: {
        API: api,
        DATABASE: database,
        SEARCH_INDEXABLE: String(stage === "prod"),
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
