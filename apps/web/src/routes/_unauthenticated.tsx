import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { Schema } from "effect";
import { fetchCurrentPrincipal } from "../features/auth/current-principal.ts";
import { ReturnPath } from "../features/auth/destination.ts";

/** What the sign-in and sign-up pages accept from the URL. */
const Search = Schema.Struct({ redirect: Schema.optional(ReturnPath) });

export const Route = createFileRoute("/_unauthenticated")({
  validateSearch: Schema.toStandardSchemaV1(Search),
  beforeLoad: async ({ search }) => {
    const currentPrincipal = await fetchCurrentPrincipal();

    if (currentPrincipal._tag === "SignedIn") {
      throw redirect({ href: search.redirect ?? "/workspaces" });
    }
  },
  component: UnauthenticatedLayout,
});

function UnauthenticatedLayout() {
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl place-items-center px-6 py-16">
      <Outlet />
    </main>
  );
}
