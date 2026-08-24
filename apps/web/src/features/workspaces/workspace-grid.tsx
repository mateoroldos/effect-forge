import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/unstable/reactivity";
import { workspaces } from "./atoms.ts";

export function WorkspaceGrid() {
  const items = useAtomValue(workspaces);

  return AsyncResult.matchWithError(items, {
    onInitial: () => <p className="text-muted-foreground">Loading…</p>,
    onError: () => <p className="text-destructive">Could not load workspaces.</p>,
    onDefect: () => <p className="text-destructive">Could not load workspaces.</p>,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <p className="text-muted-foreground">No workspaces yet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {value.map((item) => (
            <li
              className="rounded-xl border bg-card p-5 text-card-foreground"
              key={item._tag === "Saved" ? item.workspace.id : `pending:${item.name}`}
            >
              <p className="font-medium">
                {item._tag === "Saved" ? item.workspace.name : item.name}
              </p>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {item._tag === "Saved" ? item.workspace.id : "Saving…"}
              </p>
            </li>
          ))}
        </ul>
      ),
  });
}
