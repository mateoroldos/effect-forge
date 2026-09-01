import { useRouter, useSearch } from "@tanstack/react-router";
import { Schema } from "effect";

const defaultDestination = "/workspaces";

/** A same-document path that cannot be normalized into an external URL. */
export const ReturnPath = Schema.String.pipe(Schema.check(Schema.isPattern(/^\/(?!\/)[^\\]*$/)));

/** Returns the visitor to the route that required authentication. */
export const useReturnToDestination = () => {
  const router = useRouter();
  const { redirect } = useSearch({ from: "/_unauthenticated" });

  return async () => {
    await router.invalidate();
    await router.navigate({ href: redirect ?? defaultDestination });
  };
};
