import { AppApi } from "@effect-forge/contracts";
import { RequestAuth } from "./request-auth.ts";

/** Public service-liveness server projection. */
export const Health = AppApi.Health;

/** Authenticated principal server projection. */
export const Identity = AppApi.Identity.middleware(RequestAuth.Middleware);

/** Authenticated workspace server projection. */
export const Workspaces = AppApi.Workspaces.middleware(RequestAuth.Middleware);

/** Complete server projection with authentication applied to principal-owned groups. */
export const Api = Health.addHttpApi(Identity).addHttpApi(Workspaces);

export * as ServerApi from "./server-api.ts";
