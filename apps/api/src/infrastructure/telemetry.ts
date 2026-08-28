import * as Alchemy from "alchemy";
import * as Axiom from "alchemy/Axiom";
import { Config, Effect, Layer, Option, Redacted } from "effect";

const serviceName = "effect-forge-api";
const tracesName = "effect-forge-api-traces";
const logsName = "effect-forge-api-logs";
const metricsName = "effect-forge-api-metrics";

const Traces = Axiom.Dataset("ApiTraces", {
  name: tracesName,
  kind: "otel:traces:v1",
});
const Logs = Axiom.Dataset("ApiLogs", {
  name: logsName,
  kind: "otel:logs:v1",
});
const Metrics = Axiom.Dataset("ApiMetrics", {
  name: metricsName,
  kind: "otel:metrics:v1",
});
const Ingest = Axiom.ApiToken("ApiTelemetryIngest", {
  name: "effect-forge-api-telemetry",
  datasetCapabilities: {
    [tracesName]: { ingest: ["create"] },
    [logsName]: { ingest: ["create"] },
    [metricsName]: { ingest: ["create"] },
  },
});

const make = Effect.gen(function* () {
  const { stage } = yield* Alchemy.Stack;
  if (stage === "prod") {
    return Axiom.Telemetry({
      token: Ingest,
      traces: Traces,
      logs: Logs,
      metrics: Metrics,
      serviceName,
    });
  }

  const endpoint = yield* Config.url("MAPLE_ENDPOINT").pipe(
    Config.withDefault(new URL("http://localhost:4318")),
  );
  const ingestKey = yield* Config.option(Config.redacted("MAPLE_INGEST_KEY"));
  const headers = Option.map(ingestKey, (key) => ({
    Authorization: Redacted.make(`Bearer ${Redacted.value(key)}`),
  })).pipe(Option.getOrUndefined);

  return Alchemy.Telemetry.layerOtlp({
    url: endpoint.toString(),
    headers,
    serviceName,
  });
});

/** API telemetry: Maple outside production and Axiom in production. */
export const layer = Layer.unwrap(make);

export * as Telemetry from "./telemetry.ts";
