import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.ts";

/** Creates an isolated router for each application request. */
export const getRouter = () =>
  createRouter({
    routeTree,
    scrollRestoration: true,
  });

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
