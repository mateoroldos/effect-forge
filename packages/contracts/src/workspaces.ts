import { Workspace, WorkspaceName } from "@effect-forge/domain/workspace";
import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

/** Indicates that a workspace already uses the requested name. */
export class NameTaken extends Schema.TaggedError<NameTaken>()(
  "WorkspaceApi.NameTaken",
  { name: WorkspaceName },
  { httpApiStatus: 409 },
) {}

export const CreatePayload = Schema.Struct({ name: WorkspaceName });

/** Public HTTP endpoints for listing and creating workspaces. */
export const Group = HttpApiGroup.make("workspaces").add(
  HttpApiEndpoint.post("create", "/workspaces", {
    payload: CreatePayload,
    success: Workspace.pipe(HttpApiSchema.status(201)),
    error: [NameTaken, HttpApiError.InternalServerErrorNoContent],
  }),
  HttpApiEndpoint.get("list", "/workspaces", {
    success: Schema.Array(Workspace),
    error: HttpApiError.InternalServerErrorNoContent,
  }),
);

export * as WorkspaceApi from "./workspaces.ts";
