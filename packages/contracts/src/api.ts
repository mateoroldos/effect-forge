import { HttpApi } from "effect/unstable/httpapi";
import { Workspaces } from "./workspaces.ts";

/** Complete public HTTP API contract. */
export const Api = HttpApi.make("effect-forge").add(Workspaces.Group);

export * as AppApi from "./api.ts";
