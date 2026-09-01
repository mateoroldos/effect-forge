import { Layer } from "effect";
import { HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { IdentityHandlers } from "./identity-handlers.ts";
import { RequestAuth } from "./request-auth.ts";
import { ServerApi } from "./server-api.ts";
import { WorkspaceHandlers } from "./workspace-handlers.ts";

/** The HTTP API with its protected routes. Requires `Authenticator` and `IdentityDirectory`. */
export const layer = HttpApiBuilder.layer(ServerApi.Api).pipe(
  Layer.provide(IdentityHandlers.layer),
  Layer.provide(WorkspaceHandlers.layer),
  Layer.provide(RequestAuth.layer),
  Layer.provide(HttpServer.layerServices),
);

export * as App from "./app.ts";
