import type { Principal } from "@effect-forge/domain/identity";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { serverApiClient } from "../../lib/api/server-api-client.server.ts";

/** Who the server established the request to be from, before it rendered a single byte. */
export type CurrentPrincipal =
  | { readonly _tag: "SignedIn"; readonly principal: Principal }
  | { readonly _tag: "SignedOut" }
  | { readonly _tag: "Unavailable" };

const signedOut = { _tag: "SignedOut" } as const;

/**
 * Asks the API who the request's session belongs to, over the cookie the browser just sent.
 *
 * The document request carries the session because the API shares a cookie parent with this
 * application. A stage without one leaves the cookie host-only on the API, and every request
 * resolves signed out here.
 */
const resolve = Effect.gen(function* () {
  const cookie = getRequestHeader("cookie");
  if (cookie === undefined) return signedOut;

  const api = yield* serverApiClient(cookie);
  return { _tag: "SignedIn", principal: yield* api.identity.me() } as const;
}).pipe(
  Effect.catchTag("Unauthorized", () => Effect.succeed(signedOut)),
  // Anything else is the API failing, not the visitor: say so rather than showing a sign-in form.
  Effect.catchCause(() => Effect.succeed({ _tag: "Unavailable" } as const)),
);

/** Resolves the current principal while the server still owns the response. */
export const fetchCurrentPrincipal = createServerFn({ method: "GET" }).handler(
  (): Promise<CurrentPrincipal> => Effect.runPromise(resolve),
);
