import { createRouter } from "@tanstack/react-router";
import { AtomRegistryProvider, makeAtomRegistry } from "./lib/atoms/registry.tsx";
import { routeTree } from "./routeTree.gen.ts";

/** Creates an isolated router and Atom registry for each application request. */
export const getRouter = () => {
  const atomRegistry = makeAtomRegistry();

  return createRouter({
    routeTree,
    context: { atomRegistry },
    Wrap: ({ children }) => (
      <AtomRegistryProvider registry={atomRegistry}>{children}</AtomRegistryProvider>
    ),
    scrollRestoration: true,
  });
};

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
