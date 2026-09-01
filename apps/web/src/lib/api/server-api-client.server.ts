import { AppApi } from "@effect-forge/contracts";
import { Effect } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { apiBaseUrl } from "../environment.ts";

/** Typed API client that forwards the document request's session during SSR. */
export const serverApiClient = (cookie: string) =>
  HttpApiClient.make(AppApi.Api, {
    baseUrl: apiBaseUrl,
    transformClient: HttpClient.mapRequest(HttpClientRequest.setHeader("cookie", cookie)),
  }).pipe(Effect.provide(FetchHttpClient.layer));
