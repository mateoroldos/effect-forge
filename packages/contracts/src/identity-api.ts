import { Principal } from "@effect-forge/domain/identity";
import { HttpApiEndpoint, HttpApiError, HttpApiGroup } from "effect/unstable/httpapi";

/** Public HTTP endpoints for the principal behind the current request. */
export const Group = HttpApiGroup.make("identity").add(
  HttpApiEndpoint.get("me", "/me", {
    success: Principal,
    error: [
      HttpApiError.UnauthorizedNoContent,
      HttpApiError.ConflictNoContent,
      HttpApiError.InternalServerErrorNoContent,
    ],
  }),
);

export * as IdentityApi from "./identity-api.ts";
