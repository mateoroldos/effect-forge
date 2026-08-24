import { AppApi } from "@effect-forge/contracts";
import { Workspaces } from "@effect-forge/contracts/workspaces";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { Effect, Option } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";

/** Implements the workspace HTTP contract through `WorkspaceDirectory`. */
export const layer = HttpApiBuilder.group(AppApi.Api, "workspaces", (handlers) =>
  Effect.gen(function* () {
    const directory = yield* WorkspaceDirectory.Service;

    return handlers
      .handle("create", ({ payload }) =>
        directory.create(payload.name).pipe(
          Effect.catchTags({
            "WorkspaceStore.NameTaken": (error) =>
              Effect.fail(new Workspaces.WorkspaceNameTaken({ name: error.name })),
            "WorkspaceDirectory.IdGenerationError": () =>
              Effect.fail(new HttpApiError.InternalServerError({})),
            "WorkspaceStore.PersistenceError": () =>
              Effect.fail(new HttpApiError.InternalServerError({})),
          }),
        ),
      )
      .handle("findById", ({ params }) =>
        directory.findById(params.id).pipe(
          Effect.flatMap(
            Option.match({
              onNone: () => Effect.fail(new Workspaces.WorkspaceNotFound({ id: params.id })),
              onSome: Effect.succeed,
            }),
          ),
          Effect.catchTag("WorkspaceStore.PersistenceError", () =>
            Effect.fail(new HttpApiError.InternalServerError({})),
          ),
        ),
      );
  }),
);

export * as WorkspacesHttp from "./workspaces.ts";
