import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { Effect } from "effect";

export default Alchemy.Stack(
  "EffectForgeSite",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const site = yield* Cloudflare.Website.StaticSite("Site", {
      command: "bun run build",
      cwd: "apps/site",
      outdir: "dist",
      dev: { command: "bun run dev", cwd: "apps/site" },
    });

    return { siteUrl: site.url };
  }),
);
