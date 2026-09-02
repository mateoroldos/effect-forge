import type { Principal } from "@effect-forge/domain/identity";
import { Effect, Layer } from "effect";
import { RequestAuth } from "../http/request-auth.ts";

/** Provides the authenticated-request seam with a fixed test principal. */
export const authenticatedAs = (principal: Principal) =>
  Layer.succeed(
    RequestAuth.Middleware,
    RequestAuth.Middleware.of((httpEffect) =>
      Effect.provideService(httpEffect, RequestAuth.CurrentPrincipal, principal),
    ),
  );
