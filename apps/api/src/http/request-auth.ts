import { AppApi } from "@effect-forge/contracts";
import type { ProviderAccount } from "@effect-forge/core/provider-account";
import { Effect, Layer, Option } from "effect";
import { HttpServerRequest } from "effect/unstable/http";
import { HttpApiError, HttpApiMiddleware } from "effect/unstable/httpapi";

/**
 * Provider-account identification accepted by API authentication middleware.
 *
 * The Worker binds any runtime the selected adapter needs, so the API stays
 * independent of deployment vocabulary.
 */
export interface AccountIdentifier<E> {
  readonly identify: (headers: Headers) => Effect.Effect<Option.Option<ProviderAccount>, E>;
}

/** Rejects protected API requests that carry no authenticated provider account. */
export class Middleware extends HttpApiMiddleware.Service<Middleware>()(
  "@effect-forge/api/RequestAuth",
  { error: [HttpApiError.UnauthorizedNoContent, HttpApiError.InternalServerErrorNoContent] },
) {}

/**
 * The public contract with API-owned authentication applied.
 *
 * Every group in the contract is protected today. A public group would be composed
 * separately so it never pays for provider identification.
 */
export const protectedApi = AppApi.Api.middleware(Middleware);

/** Implements request authentication with the selected account identifier. */
export const layer = <E>(identifier: AccountIdentifier<E>) =>
  Layer.succeed(
    Middleware,
    Middleware.of((httpEffect) =>
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const account = yield* identifier
          .identify(new Headers(request.headers))
          .pipe(Effect.mapError(() => new HttpApiError.InternalServerError({})));

        return yield* Option.match(account, {
          onNone: () => Effect.fail(new HttpApiError.Unauthorized({})),
          onSome: () => httpEffect,
        });
      }),
    ),
  );

export * as RequestAuth from "./request-auth.ts";
