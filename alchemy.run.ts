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

    return { apiUrl: api.url };
  }),
);
