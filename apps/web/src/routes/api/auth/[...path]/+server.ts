import { Effect, Result } from "effect";
import { Authentication } from "#lib/server/authentication.ts";
import type { RequestHandler } from "./$types";

export const fallback: RequestHandler = ({ locals, request }) =>
  locals.runtime
    .runPromise(
      Effect.gen(function* () {
        const authentication = yield* Authentication.Service;
        return yield* authentication.handle;
      }).pipe(Effect.withSpan("Web.handleAuthentication"), Effect.result),
      { signal: request.signal },
    )
    .then((result) => {
      if (Result.isSuccess(result)) return result.success;

      return Response.json(
        {
          code: "SERVICE_UNAVAILABLE",
          message: "Authentication is temporarily unavailable. Please try again.",
        },
        { status: 503 },
      );
    });
