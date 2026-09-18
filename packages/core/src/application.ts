import { Layer } from "effect";
import { WorkspaceDirectory } from "./workspace/workspace-directory.ts";
import { TodoDirectory } from "./todo/todo-directory.ts";

/** Canonical dependency-open graph for request-callable application services. */
export const layer = Layer.merge(WorkspaceDirectory.layer, TodoDirectory.layer);

/** Application services exposed to inbound composition boundaries. */
export type Services = Layer.Success<typeof layer>;

/** Capabilities a composition root must provide to build the application. */
export type Requirements = Layer.Services<typeof layer>;

export * as Application from "./application.ts";
