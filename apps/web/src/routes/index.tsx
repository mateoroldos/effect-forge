import { WorkspaceId } from "@effect-forge/domain/workspace";
import { createFileRoute } from "@tanstack/react-router";
import { Option, Schema } from "effect";
import { CreateWorkspaceForm } from "../features/workspaces/create-workspace-form.tsx";
import { FindWorkspaceForm } from "../features/workspaces/find-workspace-form.tsx";

const WorkspaceSearch = Schema.Struct({ workspaceId: Schema.optional(Schema.String) });

export const Route = createFileRoute("/")({
  validateSearch: (search) => Schema.decodeSync(WorkspaceSearch)(search),
  component: LandingPage,
});

function LandingPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const workspaceId =
    search.workspaceId === undefined
      ? undefined
      : Option.getOrUndefined(Schema.decodeOption(WorkspaceId)(search.workspaceId));

  const selectWorkspace = (id: WorkspaceId) =>
    navigate({ search: { workspaceId: id }, replace: true });

  return (
    <main className="min-h-screen min-w-80 bg-stone-100 px-6 py-16 text-stone-900 sm:px-10">
      <div className="mx-auto w-full max-w-5xl">
        <section className="py-16 sm:py-24" aria-labelledby="page-title">
          <p className="mb-6 text-xs font-semibold tracking-[0.16em] text-stone-500 uppercase">
            Effect Forge
          </p>
          <h1
            id="page-title"
            className="max-w-3xl text-5xl leading-[0.92] font-medium tracking-[-0.06em] text-balance sm:text-7xl lg:text-8xl"
          >
            Build the system you can explain.
          </h1>
          <p className="mt-10 max-w-2xl text-lg leading-8 text-pretty text-stone-600 sm:text-xl">
            A typed path from browser interactions to Effect services and PostgreSQL—without hiding
            the seams that keep production software dependable.
          </p>
          <div
            className="mt-10 flex items-center gap-3 text-sm text-stone-600"
            aria-label="Application status"
          >
            <span
              className="size-2 rounded-full bg-emerald-700 ring-4 ring-emerald-700/10"
              aria-hidden="true"
            />
            <span>Web runtime ready</span>
          </div>
        </section>
        <section className="grid gap-6 lg:grid-cols-2" aria-labelledby="workspace-operations-title">
          <h2 id="workspace-operations-title" className="sr-only">
            Workspace operations
          </h2>
          <CreateWorkspaceForm onCreated={selectWorkspace} />
          <FindWorkspaceForm
            key={workspaceId ?? "unselected"}
            onSelected={selectWorkspace}
            workspaceId={workspaceId}
          />
        </section>
      </div>
    </main>
  );
}
