import { Layer } from "effect";
import { HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { RequestAuth } from "./http/request-auth.ts";
import { WorkspacesHttp } from "./http/workspaces.ts";

/** Builds the HTTP API with protected routes backed by the selected account identifier. */
export const layer = <E>(identifier: RequestAuth.AccountIdentifier<E>) =>
  HttpApiBuilder.layer(RequestAuth.protectedApi).pipe(
    Layer.provide(WorkspacesHttp.layer),
    Layer.provide(RequestAuth.layer(identifier)),
    Layer.provide(HttpServer.layerServices),
  );

export * as App from "./app.ts";
