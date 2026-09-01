import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { fetchCurrentPrincipal } from "../features/auth/current-principal.ts";
import { SignOutButton } from "../features/auth/sign-out-button.tsx";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const currentPrincipal = await fetchCurrentPrincipal();

    if (currentPrincipal._tag === "SignedOut") {
      throw redirect({ to: "/sign-in", search: { redirect: location.href } });
    }

    // Still unresolved when the API is unreachable: that is the page's problem, not the visitor's.
    return { currentPrincipal };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { currentPrincipal } = Route.useRouteContext();

  if (currentPrincipal._tag === "Unavailable") {
    return (
      <main className="mx-auto grid min-h-screen max-w-5xl place-items-center px-6 py-16">
        <p className="text-destructive">Could not load your account.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Signed in as {currentPrincipal.principal.name}
        </p>
        <SignOutButton />
      </div>
      <Outlet />
    </main>
  );
}
