import ApiWorker from "./apps/api/src/worker.ts";
import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as GitHub from "alchemy/GitHub";
import * as Neon from "alchemy/Neon";
import * as Output from "alchemy/Output";
import { Config, Effect, Layer, Option } from "effect";

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
    const browserTelemetryEnv = yield* resolveBrowserTelemetryEnv(stage);
    const api = yield* ApiWorker;
    const web = yield* Cloudflare.Website.Vite("Web", {
      rootDir: "apps/web",
      memo: {
        include: ["**/*", "../../packages/contracts/src/**", "../../packages/domain/src/**"],
        lockfile: true,
      },
      env: { VITE_API_URL: api.url.as<string>(), ...browserTelemetryEnv },
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
