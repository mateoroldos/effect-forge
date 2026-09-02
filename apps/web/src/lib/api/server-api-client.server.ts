import { AppApi } from "@effect-forge/contracts";
import { env } from "cloudflare:workers";
import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/unstable/http";
import { HttpApiClient } from "effect/unstable/httpapi";
import { apiBaseUrl } from "../environment.ts";

// SAFETY: Effect uses only the standard fetch call signature, which Cloudflare's Fetcher implements.
const apiFetch = env.API.fetch.bind(env.API) as typeof globalThis.fetch;

const serviceBindingClient = FetchHttpClient.layer.pipe(
  Layer.provide(Layer.succeed(FetchHttpClient.Fetch, apiFetch)),
);

const serverHttpClient = import.meta.env.DEV ? FetchHttpClient.layer : serviceBindingClient;

/** Typed API client that forwards the document request's session during SSR. */
export const serverApiClient = (cookie: string) =>
  HttpApiClient.make(AppApi.Api, {
    baseUrl: apiBaseUrl,
    transformClient: HttpClient.mapRequest(HttpClientRequest.setHeader("cookie", cookie)),
  }).pipe(Effect.provide(serverHttpClient));
