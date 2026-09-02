import { HttpApi } from "effect/unstable/httpapi";
import { HealthApi } from "./health-api.ts";
import { IdentityApi } from "./identity-api.ts";
import { WorkspaceApi } from "./workspace-api.ts";

/** The path prefix the authentication provider serves, outside the typed contract. */
export const authBasePath = "/auth";

const api = HttpApi.make("effect-forge");

/** Public service-liveness contract fragment. */
export const Health = api.add(HealthApi.Group);

/** Authenticated principal contract fragment. */
export const Identity = api.add(IdentityApi.Group);

/** Authenticated workspace contract fragment. */
export const Workspaces = api.add(WorkspaceApi.Group);

const publicApi = Health;
const authenticatedApi = Identity.addHttpApi(Workspaces);

/** Complete public HTTP API contract. */
export const Api = publicApi.addHttpApi(authenticatedApi);

export * as AppApi from "./app-api.ts";
