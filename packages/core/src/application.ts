import { Layer } from "effect";
import { TodoDirectory } from "./todo/todo-directory.ts";

/** Canonical dependency-open graph for request-callable application services. */
export const layer = TodoDirectory.layer;

/** Application services exposed to inbound composition boundaries. */
export type Services = Layer.Success<typeof layer>;

/** Capabilities a composition root must provide to build the application. */
export type Requirements = Layer.Services<typeof layer>;

export * as Application from "./application.ts";
