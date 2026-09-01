import { Link, createFileRoute } from "@tanstack/react-router";
import { SignUpForm } from "../../features/auth/sign-up-form.tsx";

export const Route = createFileRoute("/_unauthenticated/sign-up")({ component: SignUpPage });

function SignUpPage() {
  return (
    <div className="w-full max-w-sm">
      <SignUpForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="underline underline-offset-4" to="/sign-in" search={(prev) => prev}>
          Sign in
        </Link>
      </p>
    </div>
  );
}
