import { useAtomSet } from "@effect/atom-react";
import { Button } from "@effect-forge/ui/ui/button";
import { toast } from "@effect-forge/ui/ui/sonner";
import { useRouter } from "@tanstack/react-router";
import { Cause, Exit, Option } from "effect";
import { ProviderUnreachable, SignOutRejected, signOut } from "./atoms.ts";

const describeFailure = (cause: Cause.Cause<ProviderUnreachable | SignOutRejected>) =>
  Option.match(Cause.findErrorOption(cause), {
    onNone: () => "Please try again.",
    onSome: (failure) =>
      failure._tag === "Auth.ProviderUnreachable"
        ? "Could not reach the server. Check your connection and try again."
        : failure.message,
  });

export function SignOutButton() {
  const router = useRouter();
  const run = useAtomSet(signOut, { mode: "promiseExit" });

  return (
    <Button
      variant="ghost"
      size="sm"
      type="button"
      onClick={async () => {
        const exit = await run();

        if (Exit.isFailure(exit)) {
          toast.error("Could not sign you out", { description: describeFailure(exit.cause) });
          return;
        }

        await router.invalidate();
      }}
    >
      Sign out
    </Button>
  );
}
