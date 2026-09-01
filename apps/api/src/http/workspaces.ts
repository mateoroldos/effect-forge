import { WorkspaceApi } from "@effect-forge/contracts/workspaces";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { protectedApi } from "./request-auth.ts";

/** Implements the workspace HTTP contract through `WorkspaceDirectory`. */
export const layer = HttpApiBuilder.group(protectedApi, "workspaces", (handlers) =>
  Effect.gen(function* () {
    const directory = yield* WorkspaceDirectory.Service;

    return handlers
      .handle("create", ({ payload }) =>
        directory.create(payload.name).pipe(
          Effect.catchTags({
            "WorkspaceStore.NameTaken": (error) =>
              Effect.fail(new WorkspaceApi.NameTaken({ name: error.name })),
            "WorkspaceDirectory.IdGenerationError": () =>
              Effect.fail(new HttpApiError.InternalServerError({})),
            "WorkspaceStore.PersistenceError": () =>
              Effect.fail(new HttpApiError.InternalServerError({})),
          }),
        ),
      )
      .handle("list", () =>
        directory.list.pipe(
          Effect.catchTag("WorkspaceStore.PersistenceError", () =>
            Effect.fail(new HttpApiError.InternalServerError({})),
          ),
        ),
      );
  }),
);

export * as WorkspacesHttp from "./workspaces.ts";
