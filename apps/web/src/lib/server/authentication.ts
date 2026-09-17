import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { EmailAddress } from "@effect-forge/domain/email-address";
import { Principal, UserId } from "@effect-forge/domain/identity";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { betterAuthOptions } from "./better-auth-options.ts";

export const Viewer = Schema.Struct({
  name: Schema.String,
  email: EmailAddress,
});
export interface Viewer extends Schema.Schema.Type<typeof Viewer> {}

export interface AuthenticatedIdentity {
  readonly principal: Principal;
  readonly viewer: Viewer;
}

export class Unavailable extends Schema.TaggedError<Unavailable>()(
  "Authentication.Unavailable",
  {},
) {}

const ProviderSession = Schema.NullOr(
  Schema.Struct({
    session: Schema.Struct({}),
    user: Schema.Struct({
      id: UserId,
      name: Schema.String,
      email: EmailAddress,
    }),
  }),
);
const decodeProviderSession = Schema.decodeUnknownEffect(ProviderSession);

export interface Interface {
  readonly authenticate: Effect.Effect<AuthenticatedIdentity | null, Unavailable>;
  readonly handle: Effect.Effect<Response, Unavailable>;
}

export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/web/Authentication",
) {}

export interface Options {
  readonly baseURL: string;
  readonly database: PgAsyncDatabase<PgQueryResultHKT, typeof authSchema.authRelations>;
  readonly request: Request;
  readonly secret: Redacted.Redacted<string>;
}

export const make = Effect.fn("Authentication.make")(function* ({
  baseURL,
  database,
  request,
  secret,
}: Options) {
  const auth = betterAuth({
    ...betterAuthOptions,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authSchema,
      transaction: true,
    }),
    secret: Redacted.value(secret),
    baseURL,
  } satisfies BetterAuthOptions);

  // Better Auth cannot cancel its database promises. Let them settle before request cleanup.
  const handleRequest = Effect.fn("Authentication.handle")(function* (currentRequest: Request) {
    return yield* Effect.tryPromise({
      try: () => auth.handler(currentRequest),
      catch: () => new Unavailable({}),
    }).pipe(Effect.uninterruptible);
  });
  const handle = handleRequest(request);

  const resolveIdentity = Effect.fn("Authentication.authenticate")(function* () {
    const providerSession: unknown = yield* Effect.tryPromise({
      try: () =>
        auth.api.getSession({
          headers: request.headers,
          query: { disableRefresh: true, disableCookieCache: true },
        }),
      catch: () => new Unavailable({}),
    }).pipe(Effect.uninterruptible);
    const session = yield* decodeProviderSession(providerSession).pipe(
      Effect.mapError(() => new Unavailable({})),
    );
    if (session === null) return null;

    return {
      principal: Principal.make({ userId: session.user.id }),
      viewer: Viewer.make({ name: session.user.name, email: session.user.email }),
    };
  });
  const authenticate = yield* Effect.cached(resolveIdentity());

  return Service.of({ authenticate, handle });
});

/** Builds request-scoped authentication over an acquired Drizzle database. */
export const layer = (options: Options): Layer.Layer<Service> =>
  Layer.effect(Service, make(options));

export * as Authentication from "./authentication.ts";
