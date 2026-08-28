import { Maple } from "@maple-dev/effect-sdk/client";

/** Local browser telemetry, excluded from SSR and production builds. */
export const browserTelemetryLayer =
  import.meta.env.DEV && !import.meta.env.SSR
    ? Maple.layer({
        serviceName: "effect-forge-web",
        endpoint: import.meta.env.VITE_MAPLE_ENDPOINT ?? "http://127.0.0.1:4318",
        environment: import.meta.env.MODE,
        replay: { enabled: false },
        emitSessionMeta: false,
        tracerExportInterval: "2 seconds",
        loggerExportInterval: "2 seconds",
        metricsExportInterval: "10 seconds",
      })
    : undefined;
