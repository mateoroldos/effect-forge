import { HttpApi } from "effect/unstable/httpapi";
import { IdentityApi } from "./identity-api.ts";
import { WorkspaceApi } from "./workspace-api.ts";

/** Complete public HTTP API contract. */
export const Api = HttpApi.make("effect-forge").add(IdentityApi.Group).add(WorkspaceApi.Group);

export * as AppApi from "./app-api.ts";
