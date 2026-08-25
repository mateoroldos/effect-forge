import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Workspaces } from "@effect-forge/contracts/workspaces";
import { WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { useForm } from "@tanstack/react-form";
import { Cause, Effect, Exit, Schema } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { useState, type ReactNode } from "react";
import { createWorkspaceMutation, findWorkspaceQuery } from "./atoms.ts";

const fieldError = (errors: ReadonlyArray<unknown>) => {
  const error = errors[0];
  return typeof error === "object" && error !== null && "message" in error
    ? String(error.message)
    : undefined;
};

const requestError = (cause: Cause.Cause<unknown>) => {
  const error = Cause.squash(cause);
  if (Schema.is(Workspaces.WorkspaceNameTaken)(error)) return "That workspace name is taken.";
  if (Schema.is(Workspaces.WorkspaceNotFound)(error)) return "No workspace has that identifier.";
  return "The API request failed. Check that both local workers are running.";
};

/** Interactive workspace operations backed by the typed Effect API client. */
export function WorkspacePlayground({
  onWorkspaceSelected,
  workspaceId,
}: Readonly<{
  onWorkspaceSelected: (id: WorkspaceId) => Promise<void>;
  workspaceId: WorkspaceId | undefined;
}>) {
  return (
    <section className="grid gap-6 lg:grid-cols-2" aria-labelledby="workspace-playground-title">
      <h2 id="workspace-playground-title" className="sr-only">
        Workspace API playground
      </h2>
      <CreateWorkspace onCreated={onWorkspaceSelected} />
      <FindWorkspace onSelected={onWorkspaceSelected} workspaceId={workspaceId} />
    </section>
  );
}

function CreateWorkspace({
  onCreated,
}: Readonly<{ onCreated: (id: WorkspaceId) => Promise<void> }>) {
  const create = useAtomSet(createWorkspaceMutation, { mode: "promiseExit" });
  const [requestFailure, setRequestFailure] = useState<string>();
  const form = useForm({
    defaultValues: { name: "" },
    validators: {
      onChange: ({ value }) =>
        Schema.is(WorkspaceName)(value.name)
          ? undefined
          : "Use a non-empty, trimmed name of at most 100 characters.",
    },
    onSubmit: ({ value }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          setRequestFailure(undefined);
          const name = yield* Schema.decodeEffect(WorkspaceName)(value.name);
          const result = yield* Effect.promise(() => create({ payload: { name } }));

          if (Exit.isSuccess(result)) {
            form.reset();
            yield* Effect.promise(() => onCreated(result.value.id));
          } else {
            setRequestFailure(requestError(result.cause));
          }
        }),
      ),
  });

  return (
    <ApiCard title="Create a workspace" description="POST /workspaces">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field
          name="name"
          children={(field) => (
            <label className="block text-sm font-medium text-stone-700">
              Name
              <input
                className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-950 outline-none focus:border-stone-600"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="Effect Forge"
                value={field.state.value}
              />
              {field.state.meta.isTouched && fieldError(field.state.meta.errors) ? (
                <span className="mt-2 block text-sm text-red-700">
                  {fieldError(field.state.meta.errors)}
                </span>
              ) : null}
            </label>
          )}
        />
        {requestFailure ? <p className="text-sm text-red-700">{requestFailure}</p> : null}
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <button
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canSubmit || isSubmitting}
              type="submit"
            >
              {isSubmitting ? "Creating…" : "Create workspace"}
            </button>
          )}
        />
      </form>
    </ApiCard>
  );
}

function FindWorkspace({
  onSelected,
  workspaceId,
}: Readonly<{
  onSelected: (id: WorkspaceId) => Promise<void>;
  workspaceId: WorkspaceId | undefined;
}>) {
  const form = useForm({
    defaultValues: { id: workspaceId === undefined ? "" : String(workspaceId) },
    validators: {
      onChange: ({ value }) =>
        Schema.is(WorkspaceId)(value.id) ? undefined : "Enter a valid UUID v4.",
    },
    onSubmit: ({ value }) => onSelected(Schema.decodeSync(WorkspaceId)(value.id)),
  });

  return (
    <ApiCard title="Find a workspace" description="GET /workspaces/:id">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field
          name="id"
          children={(field) => (
            <label className="block text-sm font-medium text-stone-700">
              Workspace ID
              <input
                className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm text-stone-950 outline-none focus:border-stone-600"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                placeholder="00000000-0000-4000-8000-000000000000"
                value={field.state.value}
              />
              {field.state.meta.isTouched && fieldError(field.state.meta.errors) ? (
                <span className="mt-2 block text-sm text-red-700">
                  {fieldError(field.state.meta.errors)}
                </span>
              ) : null}
            </label>
          )}
        />
        <button
          className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-900"
          type="submit"
        >
          Find workspace
        </button>
      </form>
      {workspaceId ? <WorkspaceResult id={workspaceId} /> : null}
    </ApiCard>
  );
}

function WorkspaceResult({ id }: Readonly<{ id: WorkspaceId }>) {
  const result = useAtomValue(findWorkspaceQuery(id));

  if (AsyncResult.isInitial(result)) return <p className="mt-5 text-sm text-stone-500">Loading…</p>;
  if (AsyncResult.isFailure(result)) {
    return <p className="mt-5 text-sm text-red-700">{requestError(result.cause)}</p>;
  }

  return (
    <dl className="mt-5 rounded-lg bg-stone-100 p-4 text-sm">
      <dt className="text-stone-500">Name</dt>
      <dd className="mt-1 font-medium text-stone-950">{result.value.name}</dd>
      <dt className="mt-3 text-stone-500">ID</dt>
      <dd className="mt-1 break-all font-mono text-stone-700">{result.value.id}</dd>
    </dl>
  );
}

function ApiCard({
  children,
  description,
  title,
}: Readonly<{ children: ReactNode; description: string; title: string }>) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="font-mono text-xs text-stone-500">{description}</p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">{title}</h3>
      <div className="mt-6">{children}</div>
    </article>
  );
}
