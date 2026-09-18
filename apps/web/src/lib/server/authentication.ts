import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { OrganizationMembership } from "@effect-forge/core/organization-membership";
import { EmailAddress } from "@effect-forge/domain/email-address";
import { Principal, UserId } from "@effect-forge/domain/identity";
import {
  Organization,
  OrganizationId,
  OrganizationMember,
} from "@effect-forge/domain/organization";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { asc, eq } from "drizzle-orm";
import type { PgAsyncDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { Cache, Context, Effect, Layer, Option, Redacted, Schema } from "effect";
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

export class Unavailable extends Schema.TaggedError<Unavailable>()("Authentication.Unavailable", {
  cause: Schema.Defect(),
}) {}

export class OrganizationsUnavailable extends Schema.TaggedError<OrganizationsUnavailable>()(
  "Authentication.OrganizationsUnavailable",
  { cause: Schema.Defect() },
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

const Organizations = Schema.Array(Organization);

export interface Interface extends OrganizationMembership.Interface {
  readonly authenticate: Effect.Effect<AuthenticatedIdentity | null, Unavailable>;
  readonly handle: Effect.Effect<Response, Unavailable>;
  readonly listOrganizations: (
    userId: UserId,
  ) => Effect.Effect<ReadonlyArray<Organization>, OrganizationsUnavailable>;
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
      catch: (cause) => new Unavailable({ cause }),
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
      catch: (cause) => new Unavailable({ cause }),
    }).pipe(Effect.uninterruptible);
    const session = yield* decodeProviderSession(providerSession).pipe(
      Effect.mapError((cause) => new Unavailable({ cause })),
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

  const resolveMember = Effect.fnUntraced(
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

  // The request owns this snapshot, including absence and lookup failures.
  const memberships = yield* Cache.make({
    capacity: Number.POSITIVE_INFINITY,
    lookup: ([organizationId, userId]: readonly [OrganizationId, UserId]) =>
      resolveMember(organizationId, userId),
  });
  const member = Effect.fn("Authentication.member")(function* (
    organizationId: OrganizationId,
    userId: UserId,
  ) {
    return yield* Cache.get(memberships, [organizationId, userId]);
  });

  const listOrganizations = Effect.fn("Authentication.listOrganizations")(function* (
    userId: UserId,
  ) {
    const raw: unknown = yield* Effect.tryPromise({
      // The provider adapter's joined findMany silently defaults to 100 rows.
      try: () =>
        database
          .select({
            id: authSchema.organization.id,
            name: authSchema.organization.name,
            slug: authSchema.organization.slug,
          })
          .from(authSchema.member)
          .innerJoin(
            authSchema.organization,
            eq(authSchema.member.organizationId, authSchema.organization.id),
          )
          .where(eq(authSchema.member.userId, userId))
          .orderBy(asc(authSchema.organization.name), asc(authSchema.organization.id)),
      catch: (cause) => new OrganizationsUnavailable({ cause }),
    }).pipe(Effect.uninterruptible);
    return yield* Schema.decodeUnknownEffect(Organizations)(raw).pipe(
      Effect.mapError((cause) => new OrganizationsUnavailable({ cause })),
    );
  });

  return Service.of({ authenticate, handle, member, listOrganizations });
});

/** Shares one request-owned provider and its identity and membership snapshots. */
export const layer = (options: Options): Layer.Layer<Service | OrganizationMembership.Service> =>
  Layer.effectContext(
    make(options).pipe(
      Effect.map((service) =>
        Context.make(Service, service).pipe(Context.add(OrganizationMembership.Service, service)),
      ),
    ),
  );

export * as Authentication from "./authentication.ts";
