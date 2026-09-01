import { AppApi } from "@effect-forge/contracts";
import { Effect } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { apiBaseUrl } from "../environment.ts";

/**
 * Typed client for the public Effect Forge API, calling it as whoever `cookie` authenticates.
 *
 * The browser client sends the session the browser already holds. This one is for code running
 * on the server, which holds no session of its own and must borrow the caller's.
 */
export const serverApiClient = (cookie: string) =>
  HttpApiClient.make(AppApi.Api, {
    baseUrl: apiBaseUrl,
    transformClient: HttpClient.mapRequest(HttpClientRequest.setHeader("cookie", cookie)),
  }).pipe(Effect.provide(FetchHttpClient.layer));
