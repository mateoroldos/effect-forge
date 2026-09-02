import { Schema } from "effect";
import { HttpApiEndpoint, HttpApiGroup } from "effect/unstable/httpapi";

export const Status = Schema.Struct({ status: Schema.Literal("ok") });

/** Public service liveness endpoint. */
export const Group = HttpApiGroup.make("health").add(
  HttpApiEndpoint.get("get", "/health", { success: Status }),
);

export * as HealthApi from "./health-api.ts";
