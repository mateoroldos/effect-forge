import { useAtomSet } from "@effect/atom-react";
import { Button } from "@effect-forge/ui/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@effect-forge/ui/ui/field";
import { Input } from "@effect-forge/ui/ui/input";
import { toast } from "@effect-forge/ui/ui/sonner";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Cause, Exit, Option, Schema } from "effect";
import { ProviderUnreachable, Registration, RegistrationRejected, signUp } from "./atoms.ts";
import { useReturnToDestination } from "./destination.ts";

const describeFailure = (cause: Cause.Cause<ProviderUnreachable | RegistrationRejected>) =>
  Option.match(Cause.findErrorOption(cause), {
    onNone: () => "Please try again.",
    onSome: (failure) =>
      failure._tag === "Auth.ProviderUnreachable"
        ? "Could not reach the server. Check your connection and try again."
        : failure.message,
  });

export function SignUpForm() {
  const run = useAtomSet(signUp, { mode: "promiseExit" });
  const returnToDestination = useReturnToDestination();

  const form = useForm({
    defaultValues: { name: "", email: "", password: "" },
    validationLogic: revalidateLogic({ mode: "blur", modeAfterSubmission: "change" }),
    validators: { onDynamic: Schema.toStandardSchemaV1(Registration) },
    onSubmit: async ({ value }) => {
      const exit = await run(Schema.decodeSync(Registration)(value));

      if (Exit.isFailure(exit)) {
        toast.error("Could not create your account", { description: describeFailure(exit.cause) });
        return;
      }

      await returnToDestination();
    },
  });

  return (
    <form
      className="max-w-sm"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">Create your account</h2>
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
                  autoComplete="name"
                  placeholder="Ada Lovelace"
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                  aria-invalid={invalid}
                />
                {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        />
        <form.Field
          name="email"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="email"
                  autoComplete="email"
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                  aria-invalid={invalid}
                />
                {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        />
        <form.Field
          name="password"
          children={(field) => {
            const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={invalid}>
                <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  type="password"
                  autoComplete="new-password"
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  value={field.state.value}
                  aria-invalid={invalid}
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                {invalid ? <FieldError errors={field.state.meta.errors} /> : null}
              </Field>
            );
          }}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              Create account
            </Button>
          )}
        />
      </FieldGroup>
    </form>
  );
}
