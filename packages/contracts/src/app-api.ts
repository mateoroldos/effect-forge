import { HttpApi } from "effect/unstable/httpapi";
import { WorkspaceApi } from "./workspace-api.ts";

/** Complete public HTTP API contract. */
export const Api = HttpApi.make("effect-forge").add(WorkspaceApi.Group);

export * as AppApi from "./app-api.ts";
