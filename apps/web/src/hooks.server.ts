import { ApplicationRuntime } from "#lib/server/application.ts";
import type { Handle } from "@sveltejs/kit/hooks";

export const handle: Handle = ({ event, resolve }) => {
  if (event.platform === undefined) {
    throw new Error("SvelteKit platform environment is unavailable");
  }

  const runtime = ApplicationRuntime.make(event.platform.env.DATABASE);
  event.locals.application = runtime;

  return resolve(event).finally(runtime.dispose);
};
