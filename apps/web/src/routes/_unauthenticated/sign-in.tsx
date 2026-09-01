import { Link, createFileRoute } from "@tanstack/react-router";
import { SignInForm } from "../../features/auth/sign-in-form.tsx";

export const Route = createFileRoute("/_unauthenticated/sign-in")({ component: SignInPage });

function SignInPage() {
  return (
    <div className="w-full max-w-sm">
      <SignInForm />
      <p className="mt-6 text-sm text-muted-foreground">
        Need an account?{" "}
        <Link className="underline underline-offset-4" to="/sign-up" search={(prev) => prev}>
          Create one
        </Link>
      </p>
    </div>
  );
}
