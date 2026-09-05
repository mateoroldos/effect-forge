import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { error, redirect } from "@sveltejs/kit";
import { getRequestEvent, query } from "$app/server";
import { Effect, Match, Result } from "effect";
import { Authentication } from "#lib/server/authentication.ts";

/** Lists the workspaces visible to the current authenticated principal. */
export const listWorkspaces = query(() => {
  const event = getRequestEvent();

  return event.locals.runtime
    .runPromise(
      Effect.gen(function* () {
        const authentication = yield* Authentication.Service;
        const identity = yield* authentication.authenticate;
        if (identity === null) return { _tag: "Unauthenticated" } as const;

        const directory = yield* WorkspaceDirectory.Service;
        const workspaces = yield* directory.list(identity.principal);
        return { _tag: "Authenticated", workspaces } as const;
      }).pipe(Effect.withSpan("Web.listWorkspaces"), Effect.result),
      { signal: event.request.signal },
    )
    .then((result) => {
      if (Result.isSuccess(result)) {
        return Match.valueTags(result.success, {
          Authenticated: ({ workspaces }) => workspaces,
          Unauthenticated: () => {
            return redirect(303, "/sign-in?returnTo=%2Fworkspaces");
          },
        });
      }

      return Match.valueTags(result.failure, {
        "Authentication.Unavailable": () =>
          error(503, "Authentication is temporarily unavailable. Please try again."),
        "WorkspaceStore.PersistenceError": () =>
          error(500, "We couldn’t load your workspaces. Please try again."),
      });
    });
});
