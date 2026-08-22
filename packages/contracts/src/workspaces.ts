import { Workspace, WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiError,
  HttpApiGroup,
  HttpApiSchema,
} from "effect/unstable/httpapi";

/** Indicates that a workspace already uses the requested name. */
export class WorkspaceNameTaken extends Schema.TaggedError<WorkspaceNameTaken>()(
  "Workspaces.WorkspaceNameTaken",
  { name: WorkspaceName },
  { httpApiStatus: 409 },
) {}

/** Indicates that no workspace exists for the requested identifier. */
export class WorkspaceNotFound extends Schema.TaggedError<WorkspaceNotFound>()(
  "Workspaces.WorkspaceNotFound",
  { id: WorkspaceId },
  { httpApiStatus: 404 },
) {}

/** Public HTTP endpoints for creating and retrieving workspaces. */
export const Group = HttpApiGroup.make("workspaces").add(
  HttpApiEndpoint.post("create", "/workspaces", {
    payload: Schema.Struct({ name: WorkspaceName }),
    success: Workspace.pipe(HttpApiSchema.status(201)),
    error: [WorkspaceNameTaken, HttpApiError.InternalServerErrorNoContent],
  }),
  HttpApiEndpoint.get("findById", "/workspaces/:id", {
    params: { id: WorkspaceId },
    success: Workspace,
    error: [WorkspaceNotFound, HttpApiError.InternalServerErrorNoContent],
  }),
);

export * as Workspaces from "./workspaces.ts";
