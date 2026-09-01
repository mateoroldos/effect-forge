import { IdentityDirectory } from "@effect-forge/core/identity-directory";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { Layer } from "effect";
import { HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { IdentityHandlers } from "./identity-handlers.ts";
import { RequestAuth } from "./request-auth.ts";
import { ServerApi } from "./server-api.ts";
import { WorkspaceHandlers } from "./workspace-handlers.ts";

const applicationServices = Layer.merge(IdentityDirectory.layer, WorkspaceDirectory.layer);

/** The dependency-open HTTP application graph. */
export const layer = HttpApiBuilder.layer(ServerApi.Api).pipe(
  Layer.provide(IdentityHandlers.layer),
  Layer.provide(WorkspaceHandlers.layer),
  Layer.provide(RequestAuth.layer),
  Layer.provide(applicationServices),
  Layer.provide(HttpServer.layerServices),
);

export * as App from "./app.ts";
