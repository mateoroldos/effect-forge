import { useAtomValue } from "@effect/atom-react";
import { Workspaces } from "@effect-forge/contracts/workspaces";
import { Button } from "@effect-forge/design-system/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@effect-forge/design-system/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@effect-forge/design-system/ui/field";
import { Input } from "@effect-forge/design-system/ui/input";
import { WorkspaceId } from "@effect-forge/domain/workspace";
import { useForm } from "@tanstack/react-form";
import { Cause, Schema } from "effect";
import { AsyncResult } from "effect/unstable/reactivity";
import { findWorkspaceQuery } from "./atoms.ts";

/** Selects a workspace identifier and renders its current API representation. */
export function FindWorkspaceForm({
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
    <Card>
      <CardHeader>
        <CardDescription className="font-mono">GET /workspaces/:id</CardDescription>
        <CardTitle>Find a workspace</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            <form.Field
              name="id"
              children={(field) => {
                const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={field.name}>Workspace ID</FieldLabel>
                    <Input
                      className="font-mono"
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="00000000-0000-4000-8000-000000000000"
                      value={field.state.value}
                      aria-invalid={invalid}
                    />
                    {invalid ? <FieldError>{field.state.meta.errors[0]}</FieldError> : null}
                  </Field>
                );
              }}
            />
            <Button variant="outline" type="submit">
              Find workspace
            </Button>
          </FieldGroup>
        </form>
        {workspaceId ? <WorkspaceResult id={workspaceId} /> : null}
      </CardContent>
    </Card>
  );
}

function WorkspaceResult({ id }: Readonly<{ id: WorkspaceId }>) {
  const result = useAtomValue(findWorkspaceQuery(id));

  if (AsyncResult.isInitial(result)) {
    return <p className="mt-6 text-sm text-muted-foreground">Loading…</p>;
  }
  if (AsyncResult.isFailure(result)) {
    const error = Cause.squash(result.cause);
    const message = Schema.is(Workspaces.WorkspaceNotFound)(error)
      ? "No workspace has that identifier."
      : "The API request failed.";
    return <p className="mt-6 text-sm text-destructive">{message}</p>;
  }

  return (
    <dl className="mt-6 rounded-lg bg-muted p-4 text-sm">
      <dt className="text-muted-foreground">Name</dt>
      <dd className="mt-1 font-medium">{result.value.name}</dd>
      <dt className="mt-3 text-muted-foreground">ID</dt>
      <dd className="mt-1 break-all font-mono">{result.value.id}</dd>
    </dl>
  );
}
