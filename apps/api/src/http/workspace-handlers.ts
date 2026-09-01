import { WorkspaceApi } from "@effect-forge/contracts/workspace-api";
import { WorkspaceDirectory } from "@effect-forge/core/workspace-directory";
import { Effect } from "effect";
import { HttpApiBuilder, HttpApiError } from "effect/unstable/httpapi";
import { RequestAuth } from "./request-auth.ts";
import { ServerApi } from "./server-api.ts";

/** Implements the workspace HTTP contract through `WorkspaceDirectory`. */
export const layer = HttpApiBuilder.group(ServerApi.Api, "workspaces", (handlers) =>
  Effect.gen(function* () {
    const directory = yield* WorkspaceDirectory.Service;

    return handlers
      .handle("create", ({ payload }) =>
        Effect.gen(function* () {
          const principal = yield* RequestAuth.CurrentPrincipal;
          return yield* directory.create(principal, payload.name);
        }).pipe(
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
        Effect.gen(function* () {
          const principal = yield* RequestAuth.CurrentPrincipal;
          return yield* directory.list(principal);
        }).pipe(
          Effect.catchTag("WorkspaceStore.PersistenceError", () =>
            Effect.fail(new HttpApiError.InternalServerError({})),
          ),
        ),
      );
  }),
);

export * as WorkspaceHandlers from "./workspace-handlers.ts";
