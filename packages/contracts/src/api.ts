import { HttpApi } from "effect/unstable/httpapi";
import { WorkspaceApi } from "./workspaces.ts";

/** Complete public HTTP API contract. */
export const Api = HttpApi.make("effect-forge").add(WorkspaceApi.Group);

export * as AppApi from "./api.ts";
