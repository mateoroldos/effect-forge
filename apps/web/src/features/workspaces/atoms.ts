import type { WorkspaceId } from "@effect-forge/domain/workspace";
import { AppApiClient } from "../../lib/api/app-api-client.ts";

/** Retrieves one workspace and can be serialized for SSR hydration. */
export const findWorkspaceQuery = (id: WorkspaceId) =>
  AppApiClient.query("workspaces", "findById", {
    params: { id },
    serializationKey: id,
  });

/** Creates a workspace through the typed public API. */
export const createWorkspaceMutation = AppApiClient.mutation("workspaces", "create");
