import { WebRuntime } from "#lib/server/runtime.ts";
import type { Handle, HandleServerError } from "@sveltejs/kit/hooks";
import { Cause } from "effect";

export const handleError = (({ kind, error, event }) => {
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
  const runtime = WebRuntime.make(event);
  event.locals.run = runtime.run;

  return resolve(event).finally(() => {
    platform.ctx.waitUntil(runtime.dispose());
  });
};
