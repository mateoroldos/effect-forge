import { error, redirect } from "@sveltejs/kit";
import { Effect, Result } from "effect";
import { Authentication } from "#lib/server/authentication.ts";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, request, url }) =>
  locals.runtime
    .runPromise(
      Effect.gen(function* () {
        const authentication = yield* Authentication.Service;
        return yield* authentication.authenticate;
      }).pipe(Effect.withSpan("Web.loadAuthenticatedLayout"), Effect.result),
      { signal: request.signal },
    )
    .then((result) => {
      if (Result.isFailure(result)) {
        return error(503, "We couldn’t verify your session. Please try again.");
      }
      if (result.success === null) {
        const returnTo = `${url.pathname}${url.search}`;
        return redirect(303, `/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
      }
      return { viewer: result.success.viewer };
    });
