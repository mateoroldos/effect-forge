import { useAtomSet } from "@effect/atom-react";
import { WorkspaceApi } from "@effect-forge/contracts/workspaces";
import { Button } from "@effect-forge/design-system/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@effect-forge/design-system/ui/field";
import { Input } from "@effect-forge/design-system/ui/input";
import { useForm } from "@tanstack/react-form";
import { Cause, Effect, Exit, Match, Option, Schema } from "effect";
import { useState } from "react";
import { createWorkspace } from "./atoms.ts";

type RequestError = "NameTaken" | "RequestFailed";

export function CreateWorkspaceForm() {
  const create = useAtomSet(createWorkspace, { mode: "promiseExit" });

  const [requestError, setRequestError] = useState<RequestError>();

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: Schema.toStandardSchemaV1(WorkspaceApi.CreatePayload) },
    onSubmit: ({ value }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          setRequestError(undefined);

          const payload = yield* Schema.decodeEffect(WorkspaceApi.CreatePayload)(value);
          const result = yield* Effect.promise(() => create({ payload }));

          if (Exit.isFailure(result)) {
            setRequestError(
              Option.match(Cause.findErrorOption(result.cause), {
                onNone: (): RequestError => "RequestFailed",
                onSome: (error) =>
                  Match.value(error).pipe(
                    Match.tags({
                      "WorkspaceApi.NameTaken": (): RequestError => "NameTaken",
                    }),
                    Match.orElse((): RequestError => "RequestFailed"),
                  ),
              }),
            );
            return;
          }

          form.reset();
        }),
      ),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <FieldGroup className="sm:flex sm:items-end">
        <form.Field
          name="name"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            const nameTaken = requestError === "NameTaken";
            return (
              <Field className="flex-1" data-invalid={invalid || nameTaken}>
                <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    setRequestError(undefined);
                    field.handleChange(event.target.value);
                  }}
                  placeholder="Effect Forge"
                  value={field.state.value}
                  aria-invalid={invalid || nameTaken}
                />
                {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
                {nameTaken ? <FieldError>That workspace name is already taken.</FieldError> : null}
              </Field>
            );
          }}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              {isSubmitting ? "Creating…" : "Create workspace"}
            </Button>
          )}
        />
      </FieldGroup>
      {requestError === "RequestFailed" ? (
        <FieldError className="mt-3">Could not create the workspace.</FieldError>
      ) : null}
    </form>
  );
}
