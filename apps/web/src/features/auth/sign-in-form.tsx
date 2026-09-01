import { useAtomSet } from "@effect/atom-react";
import { Button } from "@effect-forge/ui/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@effect-forge/ui/ui/field";
import { Input } from "@effect-forge/ui/ui/input";
import { toast } from "@effect-forge/ui/ui/sonner";
import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Cause, Exit, Option, Schema } from "effect";
import { Credentials, CredentialsRejected, ProviderUnreachable, signIn } from "./atoms.ts";
import { useReturnToDestination } from "./destination.ts";

const describeFailure = (cause: Cause.Cause<CredentialsRejected | ProviderUnreachable>) =>
  Option.match(Cause.findErrorOption(cause), {
    onNone: () => "Please try again.",
    onSome: (failure) =>
      failure._tag === "Auth.ProviderUnreachable"
        ? "Could not reach the server. Check your connection and try again."
        : failure.message,
  });

export function SignInForm() {
  const run = useAtomSet(signIn, { mode: "promiseExit" });
  const returnToDestination = useReturnToDestination();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validationLogic: revalidateLogic({ mode: "blur", modeAfterSubmission: "change" }),
    validators: { onDynamic: Schema.toStandardSchemaV1(Credentials) },
    onSubmit: async ({ value }) => {
      const exit = await run(Schema.decodeSync(Credentials)(value));

      if (Exit.isFailure(exit)) {
        toast.error("Could not sign you in", { description: describeFailure(exit.cause) });
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
      <h2 className="mb-6 text-2xl font-semibold tracking-tight">Sign in</h2>
      <FieldGroup>
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
          children={(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete="current-password"
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                value={field.state.value}
              />
            </Field>
          )}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting] as const}
          children={([canSubmit, isSubmitting]) => (
            <Button disabled={!canSubmit || isSubmitting} type="submit">
              Sign in
            </Button>
          )}
        />
      </FieldGroup>
    </form>
  );
}
