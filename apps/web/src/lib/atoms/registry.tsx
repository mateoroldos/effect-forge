import { RegistryContext, scheduleTask } from "@effect/atom-react";
import { Atom, AtomRegistry } from "effect/unstable/reactivity";
import type { ReactNode } from "react";
import { browserTelemetryLayer } from "../telemetry.ts";

if (browserTelemetryLayer !== undefined) {
  Atom.runtime.addGlobalLayer(browserTelemetryLayer);
}

/** Creates the registry owned by one SSR request or browser application. */
export const createAtomRegistry = () => AtomRegistry.make({ scheduleTask });

export function AtomRegistryProvider({
  children,
  registry,
}: Readonly<{
  children: ReactNode;
  registry: AtomRegistry.AtomRegistry;
}>) {
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>;
}
