import { useAtomValue } from "@effect/atom-react";
import { Skeleton } from "@effect-forge/ui/ui/skeleton";
import type { ReactNode } from "react";
import { AsyncResult } from "effect/unstable/reactivity";
import { workspaces } from "./atoms.ts";

function WorkspaceGridLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>;
}

function WorkspaceCard({ children }: Readonly<{ children: ReactNode }>) {
  return <li className="rounded-xl border bg-card p-5 text-card-foreground">{children}</li>;
}

function WorkspaceGridSkeleton() {
  return (
    <div role="status" aria-label="Loading workspaces">
      <WorkspaceGridLayout>
        {Array.from({ length: 3 }, (_, index) => (
          <WorkspaceCard key={index}>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-3 w-full" />
          </WorkspaceCard>
        ))}
      </WorkspaceGridLayout>
    </div>
  );
}

export function WorkspaceGrid() {
  const items = useAtomValue(workspaces);

  return AsyncResult.matchWithError(items, {
    onInitial: () => <WorkspaceGridSkeleton />,
    onError: () => <p className="text-destructive">Could not load workspaces.</p>,
    onDefect: () => <p className="text-destructive">Could not load workspaces.</p>,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <p className="text-muted-foreground">No workspaces yet.</p>
      ) : (
        <WorkspaceGridLayout>
          {value.map((item, index) => (
            <WorkspaceCard
              key={item._tag === "Saved" ? item.workspace.id : `pending:${item.name}:${index}`}
            >
              <p className="font-medium">
                {item._tag === "Saved" ? item.workspace.name : item.name}
              </p>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                {item._tag === "Saved" ? item.workspace.id : "Saving…"}
              </p>
            </WorkspaceCard>
          ))}
        </WorkspaceGridLayout>
      ),
  });
}
