import { useAtomSet } from "@effect/atom-react";
import { WorkspaceApi } from "@effect-forge/contracts/workspaces";
import { Button } from "@effect-forge/design-system/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@effect-forge/design-system/ui/field";
import { Input } from "@effect-forge/design-system/ui/input";
import type { WorkspaceName } from "@effect-forge/domain/workspace";
import { useForm } from "@tanstack/react-form";
import { Cause, Effect, Exit, Option, Schema } from "effect";
import { useState } from "react";
import { createWorkspace } from "./atoms.ts";

type RequestError = "NameTaken" | "RequestFailed";

export function CreateWorkspaceForm() {
  const create = useAtomSet(createWorkspace, { mode: "promiseExit" });
  const [requestErrors, setRequestErrors] = useState<ReadonlyMap<WorkspaceName, RequestError>>(
    new Map(),
  );

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: Schema.toStandardSchemaV1(WorkspaceApi.CreatePayload) },
    onSubmit: ({ value }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const payload = yield* Schema.decodeEffect(WorkspaceApi.CreatePayload)(value);

          setRequestErrors((current) => {
            const next = new Map(current);
            next.delete(payload.name);
            return next;
          });

          const result = create({ payload });
          form.reset();

          void result.then((exit) => {
            if (Exit.isFailure(exit)) {
              const error = Option.exists(
                Cause.findErrorOption(exit.cause),
                Schema.is(WorkspaceApi.NameTaken),
              )
                ? "NameTaken"
                : "RequestFailed";
              setRequestErrors((current) => new Map(current).set(payload.name, error));
            }
          });
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
            return (
              <Field className="flex-1" data-invalid={invalid}>
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
                {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              Create workspace
            </Button>
          )}
        />
      </FieldGroup>
      {[...requestErrors].map(([name, error]) => (
        <FieldError className="mt-3" key={name}>
          {error === "NameTaken"
            ? `Could not create “${name}”: that name is already taken.`
            : `Could not create “${name}”.`}
        </FieldError>
      ))}
    </form>
  );
}
