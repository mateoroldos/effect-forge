import { BetterAuth } from "@alchemy.run/better-auth";
import { Database } from "@alchemy.run/better-auth/Database";
import { ProviderAccount, ProviderId } from "@effect-forge/core/provider-account";
import type { RuntimeContext } from "alchemy";
import type { HttpEffect } from "alchemy/Http";
import { Effect, Option, Redacted, Schema } from "effect";

/** Hosts a request may name when the deployed origin is only known at request time. */
export interface DerivedBaseUrl {
  readonly allowedHosts: ReadonlyArray<string>;
}

/** Operational options for the Better Auth inbound adapter. */
export interface Options {
  /** The public origin this API is reached at, or the hosts it may derive one from. */
  readonly baseUrl: URL | DerivedBaseUrl;
  /** The absolute path selected by the API for authentication routes. */
  readonly basePath: `/${string}`;
  /** The durable provider namespace for Better Auth subjects. */
  readonly provider: ProviderId;
  /** The secret signing sessions, or `null` to let the platform provision a stable one. */
  readonly secret: Redacted.Redacted<string> | null;
  /** Browser origins allowed to start authentication flows and receive sessions. */
  readonly trustedOrigins: ReadonlyArray<string>;
  /** Whether the browser reaches this API over HTTPS, which local development does not. */
  readonly secure: boolean;
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
    SessionUnavailable | InvalidProviderAccount,
    RuntimeContext
  >;
}

/** Indicates that Better Auth could not read the current session. */
export class SessionUnavailable extends Schema.TaggedError<SessionUnavailable>()(
  "AuthBetter.SessionUnavailable",
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
    const { baseUrl, secret, secure } = options;
    const authOptions = {
      id: "ApplicationAuth",
      baseURL:
        baseUrl instanceof URL ? baseUrl.origin : { allowedHosts: [...baseUrl.allowedHosts] },
      basePath: options.basePath,
      emailAndPassword: { enabled: true },
      trustedOrigins: [...options.trustedOrigins],
      advanced: {
        cookiePrefix: "ef",
        defaultCookieAttributes: {
          sameSite: "lax" as const,
          secure,
          httpOnly: true,
        },
        crossSubDomainCookies: { enabled: false },
      },
    };

    // Omitting the secret lets the platform provision one that is stable across deploys.
    const auth = yield* secret === null
      ? BetterAuth(authOptions)
      : BetterAuth({ ...authOptions, secret });

    const identify = Effect.fn("AuthBetter.identify")((headers: Headers) =>
      auth.getSession(headers).pipe(
        Effect.mapError((cause) => new SessionUnavailable({ cause })),
        Effect.flatMap((session) =>
          session === null
            ? Effect.succeedNone
            : decodeProviderAccount({
                identity: {
                  provider: options.provider,
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

export * as AuthBetter from "./auth-better.ts";
