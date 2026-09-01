import { AppApi } from "@effect-forge/contracts";
import { Layer } from "effect";
import { FetchHttpClient } from "effect/unstable/http";
import { AtomHttpApi } from "effect/unstable/reactivity";
import { apiBaseUrl } from "../environment.ts";

/**
 * Sends the session cookie to the API, which the browser reaches from another origin.
 *
 * `Layer.fresh` is load-bearing. Layers are memoised by identity, and the telemetry layer the
 * Atom runtime installs globally builds `FetchHttpClient.layer` too. Without a fresh instance
 * this resolves to whichever was built first, `credentials` is dropped, and every request goes
 * out anonymously.
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
