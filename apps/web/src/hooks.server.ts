import { decodeAuthOrigin } from "#lib/server/auth-origin.ts";
import { decodeAuthSecret } from "#lib/server/auth-secret.ts";
import { WebRuntime } from "#lib/server/runtime.ts";
import type { Handle } from "@sveltejs/kit/hooks";
import { dev } from "$app/env";

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
