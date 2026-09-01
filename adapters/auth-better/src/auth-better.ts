import { BetterAuth } from "@alchemy.run/better-auth";
import { CloudflareHyperdrive } from "@alchemy.run/better-auth/CloudflareHyperdrive";
import { Database } from "@alchemy.run/better-auth/Database";
import { IdentitySourceId, ProviderAccount } from "@effect-forge/core/provider-account";
import type { RuntimeContext } from "alchemy";
import type { HttpEffect } from "alchemy/Http";
import { Effect, Option, Redacted, Schema } from "effect";

/** Absolute path where the API mounts its authentication provider. */
export type BasePath = `/${string}`;

/** Operational options for the Better Auth inbound adapter. */
export interface Options {
  /** The absolute path selected by the API for authentication routes. */
  readonly basePath: BasePath;
  /** The durable issuer namespace for Better Auth subjects. */
  readonly identitySource: IdentitySourceId;
  /** The secret used to sign and verify Better Auth sessions. */
  readonly secret: Redacted.Redacted<string>;
}

/** HTTP handling and account identification backed by one Better Auth instance. */
export interface Instance {
  /** Handles Better Auth HTTP requests after the API selects a route. */
  readonly fetch: HttpEffect<RuntimeContext>;
  /** Identifies the provider account authenticated by the supplied headers. */
  readonly identify: (
    headers: Headers,
  ) => Effect.Effect<
    Option.Option<ProviderAccount>,
    AuthenticationUnavailable | InvalidProviderAccount,
    RuntimeContext
  >;
}

/** Indicates that Better Auth could not verify the current request. */
export class AuthenticationUnavailable extends Schema.TaggedError<AuthenticationUnavailable>()(
  "AuthBetter.AuthenticationUnavailable",
  { cause: Schema.Defect() },
) {}

/** Indicates that authenticated Better Auth claims do not form a provider account. */
export class InvalidProviderAccount extends Schema.TaggedError<InvalidProviderAccount>()(
  "AuthBetter.InvalidProviderAccount",
  { cause: Schema.Defect() },
) {}

const decodeProviderAccount = Schema.decodeUnknownEffect(ProviderAccount);

/** Builds one Better Auth integration while leaving database selection open. */
export const make = (options: Options): Effect.Effect<Instance, never, Database> =>
  Effect.gen(function* () {
    const auth = yield* BetterAuth({
      id: "ApplicationAuth",
      basePath: options.basePath,
      emailAndPassword: { enabled: true },
      secret: options.secret,
    });

    const identify = Effect.fn("AuthBetter.identify")((headers: Headers) =>
      auth.getSession(headers).pipe(
        Effect.mapError((cause) => new AuthenticationUnavailable({ cause })),
        Effect.flatMap((session) =>
          session === null
            ? Effect.succeedNone
            : decodeProviderAccount({
                identity: {
                  source: options.identitySource,
                  subject: session.user.id,
                },
                email: session.user.email,
                name: session.user.name,
              }).pipe(
                Effect.map(Option.some),
                Effect.mapError((cause) => new InvalidProviderAccount({ cause })),
              ),
        ),
      ),
    );

    return { fetch: auth.fetch, identify };
  });

/** Builds the Better Auth integration over an Alchemy Hyperdrive connection. */
export const makeWithHyperdrive = (
  options: Options,
  connection: Parameters<typeof CloudflareHyperdrive>[0],
) => make(options).pipe(Effect.provide(CloudflareHyperdrive(connection)));

export * as AuthBetter from "./auth-better.ts";
