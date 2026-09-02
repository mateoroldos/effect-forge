import { Effect } from "effect";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { ServerApi } from "./server-api.ts";

/** Implements the public service-liveness HTTP group. */
export const layer = HttpApiBuilder.group(ServerApi.Health, "health", (handlers) =>
  handlers.handle("get", () => Effect.succeed({ status: "ok" as const })),
);

export * as HealthHandlers from "./health-handlers.ts";
