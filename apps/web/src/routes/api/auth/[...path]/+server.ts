import { Effect, Result } from "effect";
import { Authentication } from "#lib/server/authentication.ts";
import type { RequestHandler } from "./$types";

export const fallback: RequestHandler = ({ locals }) =>
  locals
    .run(
      "Web.handleAuthentication",
      Effect.gen(function* () {
        const authentication = yield* Authentication.Service;
        return yield* authentication.handle;
      }).pipe(
        Effect.tap((response) =>
          Effect.annotateCurrentSpan("http.response.status_code", response.status),
        ),
      ),
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
