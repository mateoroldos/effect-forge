import { useAtomSet } from "@effect/atom-react";
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
import { WorkspaceId, WorkspaceName } from "@effect-forge/domain/workspace";
import { useForm } from "@tanstack/react-form";
import { Cause, Effect, Exit, Schema } from "effect";
import { useState } from "react";
import { createWorkspaceMutation } from "./atoms.ts";

/** Creates a workspace and selects it after the API confirms creation. */
export function CreateWorkspaceForm({
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

          if (Exit.isFailure(result)) {
            const error = Cause.squash(result.cause);
            setRequestFailure(
              Schema.is(Workspaces.WorkspaceNameTaken)(error)
                ? "That workspace name is taken."
                : "The API request failed.",
            );
            return;
          }

          form.reset();
          yield* Effect.promise(() => onCreated(result.value.id));
        }),
      ),
  });

  return (
    <Card>
      <CardHeader>
        <CardDescription className="font-mono">POST /workspaces</CardDescription>
        <CardTitle>Create a workspace</CardTitle>
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
              name="name"
              children={(field) => {
                const invalid = field.state.meta.isTouched && !field.state.meta.isValid;

                return (
                  <Field data-invalid={invalid}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.value)}
                      placeholder="Effect Forge"
                      value={field.state.value}
                      aria-invalid={invalid}
                    />
                    {invalid ? <FieldError>{field.state.meta.errors[0]}</FieldError> : null}
                  </Field>
                );
              }}
            />
            {requestFailure ? <FieldError>{requestFailure}</FieldError> : null}
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting] as const}
              children={([canSubmit, isSubmitting]) => (
                <Button disabled={!canSubmit || isSubmitting} type="submit">
                  {isSubmitting ? "Creating…" : "Create workspace"}
                </Button>
              )}
            />
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
