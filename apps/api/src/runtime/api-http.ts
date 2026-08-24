import { AppApi } from "@effect-forge/contracts";
import { Layer } from "effect";
import { HttpServer } from "effect/unstable/http";
import { HttpApiBuilder } from "effect/unstable/httpapi";
import { WorkspacesHttp } from "../http/workspaces.ts";

/** Builds the public HTTP API while leaving application services open. */
export const layerWithoutDependencies = HttpApiBuilder.layer(AppApi.Api).pipe(
  Layer.provide(WorkspacesHttp.layer),
  Layer.provide(HttpServer.layerServices),
);

export * as ApiHttp from "./api-http.ts";
