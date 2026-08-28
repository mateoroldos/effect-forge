import ApiWorker from "./apps/api/src/worker.ts";
import * as Alchemy from "alchemy";
import * as Axiom from "alchemy/Axiom";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as GitHub from "alchemy/GitHub";
import * as Neon from "alchemy/Neon";
import * as Output from "alchemy/Output";
import { Config, Effect, Layer } from "effect";

export default Alchemy.Stack(
  "EffectForge",
  {
    providers: Layer.mergeAll(Axiom.providers(), Drizzle.providers(), Neon.providers()).pipe(
      Layer.provideMerge(Cloudflare.providers()),
      Layer.provideMerge(GitHub.providers()),
    ),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;
    const api = yield* ApiWorker;
    const web = yield* Cloudflare.Website.Vite("Web", {
      rootDir: "apps/web",
      memo: {
        include: ["**/*", "../../packages/contracts/src/**", "../../packages/domain/src/**"],
        lockfile: true,
      },
      env: { VITE_API_URL: api.url.as<string>() },
      domain: stage === "prod" ? "app.effect-forge.com" : null,
      compatibility: {
        flags: ["nodejs_compat", "enable_request_signal"],
      },
      observability: { enabled: true },
    });

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

    return { apiUrl: api.url, webUrl: web.url };
  }),
);
