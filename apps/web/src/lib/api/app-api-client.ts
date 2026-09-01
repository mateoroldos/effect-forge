import { AppApi } from "@effect-forge/contracts";
import { FetchHttpClient } from "effect/unstable/http";
import { AtomHttpApi } from "effect/unstable/reactivity";
import { apiBaseUrl } from "../environment.ts";

/** Typed reactive client for the public Effect Forge API. */
export class AppApiClient extends AtomHttpApi.Service<AppApiClient>()(
  "@effect-forge/web/AppApiClient",
  {
    api: AppApi.Api,
    httpClient: FetchHttpClient.layer,
    baseUrl: apiBaseUrl,
  },
) {}
