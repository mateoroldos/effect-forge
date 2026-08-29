import { Maple } from "@maple-dev/effect-sdk/client";
import { Schema } from "effect";

const makeBrowserTelemetryLayer = () => {
  if (import.meta.env.VITE_TELEMETRY_ENABLED !== "true" || import.meta.env.SSR) return undefined;

  const endpoint = Schema.decodeSync(Schema.URLFromString)(
    import.meta.env.VITE_MAPLE_ENDPOINT ?? "http://127.0.0.1:4318",
  );

  return Maple.layer({
    serviceName: "effect-forge-web-browser",
    endpoint: endpoint.toString(),
    ingestKey: import.meta.env.VITE_MAPLE_INGEST_KEY,
    environment: import.meta.env.MODE,
    replay: { enabled: false },
    emitSessionMeta: false,
    tracerExportInterval: "2 seconds",
    loggerExportInterval: "2 seconds",
    metricsExportInterval: "10 seconds",
  });
};

/** Optional Maple telemetry for the browser Atom runtime. */
export const browserTelemetryLayer = makeBrowserTelemetryLayer();
