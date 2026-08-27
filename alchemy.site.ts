import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { adopt } from "alchemy/AdoptPolicy";
import { Effect } from "effect";

export default Alchemy.Stack(
  "EffectForgeSite",
  { providers: Cloudflare.providers(), state: Cloudflare.state() },
  Effect.gen(function* () {
    const { stage } = yield* Alchemy.Stack;

    if (stage === "prod") {
      yield* Cloudflare.Zone.Zone("Zone", { name: "effect-forge.com" }).pipe(adopt(true));
    }

    const site = yield* Cloudflare.Website.StaticSite("Site", {
      command: "bun run build",
      cwd: "apps/site",
      outdir: "dist",
      dev: { command: "bun run dev", cwd: "apps/site" },
      ...(stage === "prod"
        ? { domain: { name: "effect-forge.com", redirects: ["www.effect-forge.com"] } }
        : {}),
    });

    return { siteUrl: site.url };
  }),
);
