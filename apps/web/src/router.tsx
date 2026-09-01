import { Link, createRouter } from "@tanstack/react-router";
import { AtomRegistryProvider, createAtomRegistry } from "./lib/atoms/registry.tsx";
import { routeTree } from "./routeTree.gen.ts";

/** Creates an isolated router and Atom registry for each application request. */
export const getRouter = () => {
  const atomRegistry = createAtomRegistry();

  return createRouter({
    routeTree,
    context: { atomRegistry },
    Wrap: ({ children }) => (
      <AtomRegistryProvider registry={atomRegistry}>{children}</AtomRegistryProvider>
    ),
    scrollRestoration: true,
    defaultNotFoundComponent: NotFound,
  });
};

function NotFound() {
  return (
    <main className="mx-auto grid min-h-screen max-w-5xl place-items-center px-6 py-16">
      <div>
        <h1 className="text-4xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-3 text-muted-foreground">That page does not exist.</p>
        <Link className="mt-6 inline-block underline underline-offset-4" to="/">
          Back home
        </Link>
      </div>
    </main>
  );
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
