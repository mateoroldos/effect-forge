import { AppApi } from "@effect-forge/contracts";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { AtomHttpApi } from "effect/unstable/reactivity";
import { apiBaseUrl } from "../environment.ts";

/**
 * `Layer.fresh` prevents the telemetry client's memoized Fetch layer from dropping the
 * credential mode required by local development's second origin.
 */
const httpClient = Layer.fresh(FetchHttpClient.layer).pipe(
  Layer.provide(Layer.succeed(FetchHttpClient.RequestInit, { credentials: "include" })),
);

/** Typed reactive client for the public Effect Forge API. */
export class AppApiClient extends AtomHttpApi.Service<AppApiClient>()(
  "@effect-forge/web/AppApiClient",
  {
    api: AppApi.Api,
    httpClient,
    baseUrl: apiBaseUrl,
  },
) {}
