import { createFileRoute } from "@tanstack/react-router";
import { CreateWorkspaceForm } from "../features/workspaces/create-workspace-form.tsx";
import { WorkspaceGrid } from "../features/workspaces/workspace-grid.tsx";

export const Route = createFileRoute("/workspaces")({ component: WorkspacesRoute });

function WorkspacesRoute() {
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <header className="mb-10">
        <p className="text-sm font-medium text-muted-foreground">Effect Forge</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Workspaces</h1>
        <p className="mt-3 text-muted-foreground">
          Names are unique. Reuse one to see optimistic rollback and typed errors.
        </p>
      </header>
      <section className="mb-10" aria-label="Create workspace">
        <CreateWorkspaceForm />
      </section>
      <WorkspaceGrid />
    </main>
  );
}
