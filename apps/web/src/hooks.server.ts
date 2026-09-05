import { decodeAuthOrigin } from "#lib/server/auth-origin.ts";
import { decodeAuthSecret } from "#lib/server/auth-secret.ts";
import { WebRuntime } from "#lib/server/runtime.ts";
import type { Handle } from "@sveltejs/kit/hooks";

export const handle: Handle = ({ event, resolve }) => {
  const platform = event.platform;
  if (platform === undefined) {
    throw new Error("SvelteKit platform environment is unavailable");
  }
  const authOrigin = decodeAuthOrigin(platform.env.AUTH_ORIGIN);
  const runtime = WebRuntime.make({
    baseURL: authOrigin.origin,
    database: platform.env.DATABASE,
    request: event.request,
    secret: decodeAuthSecret(platform.env.AUTH_SECRET),
  });
  event.locals.runtime = runtime;

  return resolve(event).finally(() => runtime.dispose());
};
