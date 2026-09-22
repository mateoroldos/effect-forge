import { error } from "@sveltejs/kit";
import { getRequestEvent, query } from "$app/server";
import { Effect, Match, Result } from "effect";
import { Authentication } from "#lib/server/authentication.ts";
import { AuthGuard } from "#lib/server/auth-guard.ts";

export const listOrganizations = query(() =>
  getRequestEvent()
    .locals.run(
      "Remote.listOrganizations",
      Effect.gen(function* () {
        const authentication = yield* Authentication.Service;
        const identity = yield* AuthGuard.requireIdentity;
        return yield* authentication.listOrganizations(identity.principal.userId);
      }),
    )
    .then(
      Result.getOrElse((failure) =>
        Match.valueTags(failure, {
          "AuthGuard.Unauthenticated": (failure) => AuthGuard.reject(failure),
          "Authentication.Unavailable": (failure) => AuthGuard.reject(failure),
          "Authentication.OrganizationsUnavailable": () =>
            error(503, "We couldn’t load your organizations. Please try again."),
        }),
      ),
    ),
);
