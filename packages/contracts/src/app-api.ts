import { HttpApi } from "effect/unstable/httpapi";
import { HealthApi } from "./health-api.ts";
import { IdentityApi } from "./identity-api.ts";
import { WorkspaceApi } from "./workspace-api.ts";

/** The path namespace reserved for the API Worker. */
export const apiBasePath = "/api";

/** The path prefix the authentication provider serves, outside the typed contract. */
export const authBasePath = `${apiBasePath}/auth` as const;

const api = HttpApi.make("effect-forge");

/** Public service-liveness contract fragment. */
export const Health = api.add(HealthApi.Group).prefix(apiBasePath);

/** Authenticated principal contract fragment. */
export const Identity = api.add(IdentityApi.Group).prefix(apiBasePath);

/** Authenticated workspace contract fragment. */
export const Workspaces = api.add(WorkspaceApi.Group).prefix(apiBasePath);

const publicApi = Health;
const authenticatedApi = Identity.addHttpApi(Workspaces);

/** Complete public HTTP API contract. */
export const Api = publicApi.addHttpApi(authenticatedApi);

export * as AppApi from "./app-api.ts";
