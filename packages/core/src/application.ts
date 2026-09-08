import { Layer } from "effect";
import { IdentityDirectory } from "./identity/identity-directory.ts";
import { WorkspaceDirectory } from "./workspace/workspace-directory.ts";

/** Canonical dependency-open graph for request-callable application services. */
export const layer = Layer.mergeAll(IdentityDirectory.layer, WorkspaceDirectory.layer);

/** Application services exposed to inbound composition boundaries. */
export type Services = Layer.Success<typeof layer>;

/** Capabilities a composition root must provide to build the application. */
export type Requirements = Layer.Services<typeof layer>;

export * as Application from "./application.ts";
