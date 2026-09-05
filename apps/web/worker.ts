import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { stageHostFor } from "../../infra/stage.ts";
import { Database } from "../../infra/database.ts";

const webRoot = fileURLToPath(new URL(".", import.meta.url));

export default class WebWorker extends Cloudflare.Website.SvelteKit<WebWorker>()(
  "Web",
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const stageHost = stageHostFor(stage);
    const database = yield* Database.hyperdrive;
    const authSecret = yield* Alchemy.Random("ApplicationAuthSecret");

    return {
      rootDir: webRoot,
      env: {
        AUTH_SECRET: authSecret.text,
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
