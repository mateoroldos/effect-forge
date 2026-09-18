import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { OrganizationMembership } from "@effect-forge/core/organization-membership";
import { EmailAddress } from "@effect-forge/domain/email-address";
import { Principal, UserId } from "@effect-forge/domain/identity";
import { OrganizationId, OrganizationMember } from "@effect-forge/domain/organization";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Context, Effect, Layer, Option, Redacted, Schema } from "effect";
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
const ProviderMember = Schema.NullOr(
  Schema.Struct({
    organizationId: OrganizationId,
    userId: UserId,
    role: Schema.String,
  }),
);

export interface Interface extends OrganizationMembership.Interface {
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

export const make = Effect.fnUntraced(function* ({ baseURL, database, request, secret }: Options) {
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

  const resolveIdentity = Effect.fnUntraced(function* () {
    yield* Effect.annotateCurrentSpan("app.auth.reused", false);
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
  const cachedIdentity = yield* Effect.cached(resolveIdentity());
  const authenticate = cachedIdentity.pipe(
    Effect.withSpan("Authentication.authenticate", { attributes: { "app.auth.reused": true } }),
  );

  const member = Effect.fn("Authentication.member")(
    function* (organizationId: OrganizationId, userId: UserId) {
      // Read membership without re-entering session middleware or refreshing cookies.
      const raw: unknown = yield* Effect.tryPromise({
        try: () =>
          auth.$context.then(({ adapter }) =>
            adapter.findOne({
              model: "member",
              where: [
                { field: "organizationId", value: organizationId },
                { field: "userId", value: userId },
              ],
            }),
          ),
        catch: (cause) => new OrganizationMembership.Unavailable({ cause }),
      }).pipe(Effect.uninterruptible);
      const row = yield* Schema.decodeUnknownEffect(ProviderMember)(raw);
      if (row === null) return Option.none();
      const membership = yield* Schema.decodeUnknownEffect(OrganizationMember)({
        organizationId: row.organizationId,
        userId: row.userId,
        roles: row.role.split(","),
      });
      return Option.some(membership);
    },
    Effect.catchTag("SchemaError", (cause) => new OrganizationMembership.Unavailable({ cause })),
  );

  return Service.of({ authenticate, handle, member });
});

/** Builds request-scoped authentication over an acquired Drizzle database. */
export const layer = (options: Options): Layer.Layer<Service | OrganizationMembership.Service> =>
  Layer.effectContext(
    make(options).pipe(
      Effect.map((service) =>
        Context.make(Service, service).pipe(Context.add(OrganizationMembership.Service, service)),
      ),
    ),
  );

export * as Authentication from "./authentication.ts";
