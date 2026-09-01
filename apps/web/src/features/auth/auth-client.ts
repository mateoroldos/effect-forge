import { AppApi } from "@effect-forge/contracts";
import { createAuthClient } from "better-auth/client";
import { apiBaseUrl } from "../../lib/environment.ts";

/** The only browser module that names the authentication provider. */
export const authClient = createAuthClient({
  baseURL: apiBaseUrl.origin,
  basePath: AppApi.authBasePath,
});
