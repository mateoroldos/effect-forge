import { AppApi } from "@effect-forge/contracts";
import { RequestAuth } from "./request-auth.ts";

/** The contract as this server implements it: every group behind request authentication. */
export const Api = AppApi.Api.middleware(RequestAuth.Middleware);

export * as ServerApi from "./server-api.ts";
