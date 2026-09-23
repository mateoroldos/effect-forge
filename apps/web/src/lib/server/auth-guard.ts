import { error, redirect } from "@sveltejs/kit";
import { Effect, Match, Schema } from "effect";
import { Authentication } from "./authentication.ts";

export class Unauthenticated extends Schema.TaggedError<Unauthenticated>()(
  "AuthGuard.Unauthenticated",
  {},
) {}

export const requireIdentity = Effect.gen(function* () {
  const authentication = yield* Authentication.Service;
  const identity = yield* authentication.authenticate;
  if (identity === null) return yield* new Unauthenticated({});
  return identity;
});

/** Throws SvelteKit control flow; call only after the request runner, outside Effect. */
export const reject = (
  failure: Unauthenticated | Authentication.Unavailable,
  returnTo = "/",
): never =>
  Match.valueTags(failure, {
    "AuthGuard.Unauthenticated": () =>
      redirect(303, `/sign-in?returnTo=${encodeURIComponent(returnTo)}`),
    "Authentication.Unavailable": () =>
      error(503, "We couldn’t verify your session. Please try again."),
  });

export * as AuthGuard from "./auth-guard.ts";
