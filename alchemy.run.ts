import ApiWorker from "./apps/api/worker.ts";
import { ApiBinding, WebWorker } from "./apps/web/worker.ts";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as GitHub from "alchemy/GitHub";
import * as Neon from "alchemy/Neon";
import * as Output from "alchemy/Output";
import { Config, Effect, Layer } from "effect";
import { stageHostFor } from "./infra/stage.ts";

export default Alchemy.Stack(
  "EffectForge",
  {
    providers: Layer.mergeAll(Drizzle.providers(), Neon.providers()).pipe(
      Layer.provideMerge(Cloudflare.providers()),
      Layer.provideMerge(GitHub.providers()),
    ),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const stageHost = stageHostFor(stage);
    const api = yield* ApiWorker;
    const web = yield* WebWorker.pipe(Effect.provideService(ApiBinding, api));

    if (stage.startsWith("pr-")) {
      const pullRequest = yield* Config.int("PULL_REQUEST");
      yield* GitHub.Comment("PreviewComment", {
        owner: "mateoroldos",
        repository: "effect-forge",
        issueNumber: pullRequest,
        body: Output.interpolate`Preview: ${web.url}`,
        allowDelete: true,
      });
    }

    return { apiUrl: stageHost?.origin ?? api.url, webUrl: web.url };
  }),
);
