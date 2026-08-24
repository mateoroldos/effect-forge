import type { Workspace, WorkspaceName } from "@effect-forge/domain/workspace";
import { AsyncResult, Atom } from "effect/unstable/reactivity";
import { AppApiClient } from "../../lib/api/app-api-client.ts";

export type WorkspaceItem =
  | { readonly _tag: "Saved"; readonly workspace: Workspace }
  | { readonly _tag: "Pending"; readonly name: WorkspaceName };

const listWorkspaces = AppApiClient.query("workspaces", "list", {}).pipe(
  Atom.map(
    AsyncResult.map((workspaces): ReadonlyArray<WorkspaceItem> =>
      workspaces.map((workspace) => ({ _tag: "Saved", workspace })),
    ),
  ),
);

export const workspaces = Atom.optimistic(listWorkspaces);

export const createWorkspace = Atom.optimisticFn(workspaces, {
  reducer: (current, { payload }) =>
    AsyncResult.map(current, (items) => [
      ...items,
      { _tag: "Pending" as const, name: payload.name },
    ]),
  fn: AppApiClient.mutation("workspaces", "create"),
});
