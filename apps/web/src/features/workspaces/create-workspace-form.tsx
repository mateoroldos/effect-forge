import { useAtomSet } from "@effect/atom-react";
import { WorkspaceApi } from "@effect-forge/contracts/workspaces";
import { Button } from "@effect-forge/ui/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@effect-forge/ui/ui/field";
import { Input } from "@effect-forge/ui/ui/input";
import { toast } from "@effect-forge/ui/ui/sonner";
import { useForm } from "@tanstack/react-form";
import { Cause, Effect, Exit, Match, Option, Schema } from "effect";
import { createWorkspace } from "./atoms.ts";

export function CreateWorkspaceForm() {
  const create = useAtomSet(createWorkspace, { mode: "promiseExit" });

  const form = useForm({
    defaultValues: { name: "" },
    validators: { onChange: Schema.toStandardSchemaV1(WorkspaceApi.CreatePayload) },
    onSubmit: ({ value }) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const payload = yield* Schema.decodeEffect(WorkspaceApi.CreatePayload)(value);

          const result = create({ payload });
          form.reset();

          void result.then((exit) => {
            if (Exit.isFailure(exit)) {
              Option.match(Cause.findErrorOption(exit.cause), {
                onNone: () =>
                  toast.error(`Could not create “${payload.name}”`, {
                    description: "Please try again.",
                  }),
                onSome: (error) =>
                  Match.value(error).pipe(
                    Match.tags({
                      "WorkspaceApi.NameTaken": (error) =>
                        toast.error(`Could not create “${error.name}”`, {
                          description: "That workspace name is already taken.",
                          action: {
                            label: "Try again",
                            onClick: () => form.setFieldValue("name", error.name),
                          },
                        }),
                    }),
                    Match.orElse(() =>
                      toast.error(`Could not create “${payload.name}”`, {
                        description: "Please try again.",
                      }),
                    ),
                  ),
              });
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
    </form>
  );
}
