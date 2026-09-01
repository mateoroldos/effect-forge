import { IdentityDirectory } from "@effect-forge/core/identity-directory";
import type { ProviderAccount } from "@effect-forge/core/provider-account";
import type { Principal } from "@effect-forge/domain/identity";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { HttpServerRequest } from "effect/unstable/http";
import { HttpApiError, HttpApiMiddleware } from "effect/unstable/httpapi";

/** The principal authenticated for the current request. */
export class CurrentPrincipal extends Context.Service<CurrentPrincipal, Principal>()(
  "@effect-forge/api/CurrentPrincipal",
) {}

/** Indicates that the authentication provider could not identify the request. */
export class IdentificationFailed extends Schema.TaggedError<IdentificationFailed>()(
  "RequestAuth.IdentificationFailed",
  { cause: Schema.Defect() },
) {}

/** Reads the provider account the request headers authenticate, if any. */
export class Authenticator extends Context.Service<
  Authenticator,
  {
    readonly identify: (
      headers: Headers,
    ) => Effect.Effect<Option.Option<ProviderAccount>, IdentificationFailed>;
  }
>()("@effect-forge/api/Authenticator") {}

/** Rejects unauthenticated requests and provides the principal behind the rest. */
export class Middleware extends HttpApiMiddleware.Service<
  Middleware,
  { provides: CurrentPrincipal; requires: Authenticator | IdentityDirectory.Service }
>()("@effect-forge/api/RequestAuth", {
  error: [
    HttpApiError.UnauthorizedNoContent,
    HttpApiError.ConflictNoContent,
    HttpApiError.InternalServerErrorNoContent,
  ],
}) {}

export const layer = Layer.succeed(
  Middleware,
  Middleware.of((httpEffect) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const { identify } = yield* Authenticator;
      const identities = yield* IdentityDirectory.Service;

      const account = yield* identify(new Headers(request.headers)).pipe(
        Effect.mapError(() => new HttpApiError.InternalServerError({})),
      );
      const authenticated = yield* Option.match(account, {
        onNone: () => Effect.fail(new HttpApiError.Unauthorized({})),
        onSome: Effect.succeed,
      });
      const principal = yield* identities.resolve(authenticated).pipe(
        Effect.catchTags({
          "IdentityStore.EmailTaken": () => Effect.fail(new HttpApiError.Conflict({})),
          "IdentityStore.PersistenceError": () =>
            Effect.fail(new HttpApiError.InternalServerError({})),
          "IdentityDirectory.IdGenerationError": () =>
            Effect.fail(new HttpApiError.InternalServerError({})),
        }),
      );

      return yield* Effect.provideService(httpEffect, CurrentPrincipal, principal);
    }),
  ),
);

export * as RequestAuth from "./request-auth.ts";
