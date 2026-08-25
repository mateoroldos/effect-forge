import ApiWorker from "./apps/api/src/worker.ts";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Neon from "alchemy/Neon";
import { Effect, Layer } from "effect";

export default Alchemy.Stack(
  "EffectForge",
  {
    providers: Layer.merge(Drizzle.providers(), Neon.providers()).pipe(
      Layer.provideMerge(Cloudflare.providers()),
    ),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const api = yield* ApiWorker;
    const web = yield* Cloudflare.Website.Vite("Web", {
      rootDir: "apps/web",
      memo: {
        include: ["**/*", "../../packages/contracts/src/**", "../../packages/domain/src/**"],
        lockfile: true,
      },
      env: { VITE_API_URL: api.url.as<string>() },
      assets: { runWorkerFirst: true },
      compatibility: {
        flags: ["nodejs_compat", "enable_request_signal"],
      },
      observability: { enabled: true },
    });

    return { apiUrl: api.url, webUrl: web.url };
  }),
);
