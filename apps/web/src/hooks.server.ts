import { decodeAuthOrigin } from "#lib/server/auth-origin.ts";
import { decodeAuthSecret } from "#lib/server/auth-secret.ts";
import { WebRuntime } from "#lib/server/runtime.ts";
import type { CaughtError, Handle, HandleServerError } from "@sveltejs/kit/hooks";
import { Cause } from "effect";
import { dev } from "$app/env";

export const handleError = (({ kind, error, event }: CaughtError) => {
  if (kind !== "unknown") return;
  const cancelled =
    event.request.signal.aborted &&
    error instanceof Error &&
    Cause.isCause(error.cause) &&
    Cause.hasInterruptsOnly(error.cause);
  if (!cancelled) {
    // oxlint-disable-next-line effecttsgo/global-console -- this boundary must report failures even when the Effect runtime is unavailable.
    console.error(error);
  }
  return { message: "Something went wrong. Refresh before trying again." };
}) satisfies HandleServerError;

export const handle: Handle = ({ event, resolve }) => {
  const platform = event.platform;
  if (platform === undefined) {
    throw new Error("SvelteKit platform environment is unavailable");
  }
  const authOrigin = decodeAuthOrigin(platform.env.AUTH_ORIGIN);
  const runtime = WebRuntime.make({
    baseURL: authOrigin.origin,
    connectionString: platform.env.DATABASE.connectionString,
    request: event.request,
    routeId: event.route.id,
    secret: decodeAuthSecret(platform.env.AUTH_SECRET),
    stage: platform.env.DEPLOYMENT_ENVIRONMENT,
    dev,
    telemetry: {
      endpoint: platform.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    },
  });
  event.locals.run = runtime.run;

  return resolve(event).finally(() => {
    platform.ctx.waitUntil(runtime.dispose());
  });
};
