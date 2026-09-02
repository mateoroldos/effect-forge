import { HttpApiBuilder } from "effect/unstable/httpapi";
import { RequestAuth } from "./request-auth.ts";
import { ServerApi } from "./server-api.ts";

export const layer = HttpApiBuilder.group(ServerApi.Identity, "identity", (handlers) =>
  handlers.handle("me", () => RequestAuth.CurrentPrincipal),
);

export * as IdentityHandlers from "./identity-handlers.ts";
