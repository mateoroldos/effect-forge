import { IdentityDirectory } from "@effect-forge/core/identity-directory";
import type { Principal } from "@effect-forge/domain/identity";
import { Effect, Layer } from "effect";
import { RequestAuth } from "../http/request-auth.ts";

/** Provides the authenticated-request seam with a fixed test principal. */
export const authenticatedAs = (principal: Principal) =>
  Layer.mergeAll(
    Layer.succeed(
      RequestAuth.Middleware,
      RequestAuth.Middleware.of((httpEffect) =>
        Effect.provideService(httpEffect, RequestAuth.CurrentPrincipal, principal),
      ),
    ),
    Layer.succeed(RequestAuth.Authenticator, {
      identify: () => Effect.die("the principal test middleware does not identify requests"),
    }),
    Layer.succeed(IdentityDirectory.Service, {
      resolve: () => Effect.die("the principal test middleware does not resolve identities"),
    }),
  );
