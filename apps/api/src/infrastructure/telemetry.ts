import * as Alchemy from "alchemy";
import { Config, Effect, Layer, Option, Redacted } from "effect";

const serviceName = "effect-forge-api";

const make = Effect.gen(function* () {
  const enabled = yield* Config.boolean("TELEMETRY_ENABLED").pipe(Config.withDefault(false));
  if (!enabled) return Layer.empty;

  const { stage } = yield* Alchemy.Stack;
  const endpoint = yield* Config.url("MAPLE_ENDPOINT").pipe(
    Config.withDefault(
      new URL(stage.startsWith("dev_") ? "http://127.0.0.1:4318" : "https://ingest.maple.dev"),
    ),
  );
  const local = ["127.0.0.1", "::1", "[::1]", "localhost"].includes(endpoint.hostname);
  const ingestKey = local
    ? yield* Config.option(Config.redacted("MAPLE_INGEST_KEY"))
    : Option.some(yield* Config.redacted("MAPLE_INGEST_KEY"));
  const headers = Option.map(ingestKey, (key) => ({
    Authorization: Redacted.make(`Bearer ${Redacted.value(key)}`),
  })).pipe(Option.getOrUndefined);

  return Alchemy.Telemetry.layerOtlp({
    url: endpoint.toString(),
    headers,
    serviceName,
  });
});

/** Optional Maple telemetry for the API Worker runtime. */
export const layer = Layer.unwrap(make);

export * as Telemetry from "./telemetry.ts";
