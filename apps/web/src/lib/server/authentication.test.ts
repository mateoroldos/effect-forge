import { assert, describe, it } from "@effect/vitest";
import { OrganizationMembership } from "@effect-forge/core/organization-membership";
import { UserId } from "@effect-forge/domain/identity";
import { OrganizationId, OrganizationMember } from "@effect-forge/domain/organization";
import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { PgliteDatabase } from "@effect-forge/database-postgres/test/pglite-database";
import { eq, sql } from "drizzle-orm";
import { DateTime, Effect, Fiber, Option, Redacted, Result, Schema } from "effect";
import { Authentication } from "./authentication.ts";
import { AuthGuard } from "./auth-guard.ts";

const baseURL = new URL("http://localhost:5173");
const createdAt = DateTime.toDateUtc(DateTime.makeUnsafe(0));
const secret = Redacted.make("test-secret-value-with-at-least-32-characters");
const signUpBody =
  '{"name":"Ada Lovelace","email":"ada@example.com","password":"correct-horse-battery-staple"}';
const encodeBody = Schema.encodeSync(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.String)),
);

const request = (path: string, init?: RequestInit & { duplex?: "half" }) =>
  new Request(new URL(path, baseURL), init);

const fixture = Effect.gen(function* () {
  const { database } = yield* PgliteDatabase.make;

  const authentication = (currentRequest: Request) =>
    Authentication.make({ baseURL: baseURL.origin, database, request: currentRequest, secret });

  const signUp = Effect.fn("AuthenticationTest.signUp")(function* () {
    const service = yield* authentication(
      request("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: baseURL.origin },
        body: signUpBody,
      }),
    );
    const response = yield* service.handle;
    assert.strictEqual(response.status, 200);
    return response.headers
      .getSetCookie()
      .map((value) => value.slice(0, value.indexOf(";")))
      .join("; ");
  });

  const authenticate = Effect.fn("AuthenticationTest.authenticate")(function* (cookie?: string) {
    const headers = new Headers();
    if (cookie !== undefined) headers.set("cookie", cookie);
    const service = yield* authentication(request("/organizations", { headers }));
    return yield* service.authenticate;
  });

  return { authenticate, authentication, database, signUp };
});

describe("Authentication", () => {
  it.effect("distinguishes an organization-list outage after successful authentication", () =>
    Effect.gen(function* () {
      const { authentication, database, signUp } = yield* fixture;
      const cookie = yield* signUp();
      const service = yield* authentication(request("/organizations", { headers: { cookie } }));
      const identity = yield* AuthGuard.requireIdentity.pipe(
        Effect.provideService(Authentication.Service, service),
      );
      assert.deepEqual(yield* service.listOrganizations(identity.principal.userId), []);

      yield* Effect.promise(() => database.execute(sql`drop table member`));
      const failure = yield* service.listOrganizations(identity.principal.userId).pipe(Effect.flip);
      assert.instanceOf(failure, Authentication.OrganizationsUnavailable);
      assert.instanceOf(failure.cause, Error);
      assert.strictEqual(yield* service.authenticate, identity);
    }),
  );

  it.effect("requires identity without confusing absence with provider failure", () =>
    Effect.gen(function* () {
      const { authentication, database, signUp } = yield* fixture;
      const anonymous = yield* authentication(request("/organizations"));
      const absent = yield* AuthGuard.requireIdentity.pipe(
        Effect.provideService(Authentication.Service, anonymous),
        Effect.result,
      );
      assert.isTrue(Result.isFailure(absent));
      if (Result.isFailure(absent))
        assert.strictEqual(absent.failure._tag, "AuthGuard.Unauthenticated");

      const cookie = yield* signUp();
      const signedIn = yield* authentication(request("/organizations", { headers: { cookie } }));
      const identity = yield* AuthGuard.requireIdentity.pipe(
        Effect.provideService(Authentication.Service, signedIn),
      );
      assert.strictEqual(identity.viewer.name, "Ada Lovelace");

      yield* Effect.promise(() => database.execute(sql`drop table "session"`));
      const unavailable = yield* authentication(request("/organizations", { headers: { cookie } }));
      const failed = yield* AuthGuard.requireIdentity.pipe(
        Effect.provideService(Authentication.Service, unavailable),
        Effect.result,
      );
      assert.isTrue(Result.isFailure(failed));
      if (Result.isFailure(failed))
        assert.strictEqual(failed.failure._tag, "Authentication.Unavailable");
    }),
  );

  describe("organization membership", () => {
    const organizationId = OrganizationId.make("org-1");
    const userId = UserId.make("user-1");
    const membershipFixture = Effect.gen(function* () {
      const auth = yield* fixture;
      yield* Effect.promise(() =>
        auth.database
          .insert(authSchema.user)
          .values({ id: userId, name: "Ada", email: "ada@example.com" }),
      );
      yield* Effect.promise(() =>
        auth.database
          .insert(authSchema.organization)
          .values({ id: organizationId, name: "Engine", slug: "engine", createdAt }),
      );
      yield* Effect.promise(() =>
        auth.database.insert(authSchema.member).values({
          id: "member-1",
          userId,
          organizationId,
          role: "owner",
          createdAt,
        }),
      );
      const service = yield* auth.authentication(request("/organizations"));
      return { ...auth, service };
    });

    it.effect(
      "lists every organization beyond the provider's default limit without leaking other users",
      () =>
        Effect.gen(function* () {
          const { database, service } = yield* membershipFixture;
          const organizations = Array.from({ length: 105 }, (_, index) => ({
            id: `extra-${index.toString().padStart(3, "0")}`,
            name: `Extra ${index.toString().padStart(3, "0")}`,
            slug: `extra-${index}`,
            createdAt,
          }));
          yield* Effect.promise(() =>
            database.insert(authSchema.organization).values(organizations),
          );
          yield* Effect.promise(() =>
            database.insert(authSchema.member).values(
              organizations.map(({ id }) => ({
                id: `member-${id}`,
                organizationId: id,
                userId,
                role: "member",
                createdAt,
              })),
            ),
          );
          const listed = yield* service.listOrganizations(userId);
          assert.deepEqual(listed, [
            { id: organizationId, name: "Engine", slug: "engine" },
            ...organizations.map(({ id, name, slug }) => ({
              id: OrganizationId.make(id),
              name,
              slug,
            })),
          ]);
          assert.deepEqual(yield* service.listOrganizations(UserId.make("another-user")), []);
        }),
    );

    it.effect.each([
      { role: "owner", roles: ["owner"] },
      { role: "admin", roles: ["admin"] },
      { role: "member", roles: ["member"] },
      { role: "admin,member", roles: ["admin", "member"] },
    ] as const)("decodes provider role $role", ({ role, roles }) =>
      Effect.gen(function* () {
        const { database, service } = yield* membershipFixture;
        yield* Effect.promise(() => database.update(authSchema.member).set({ role }));
        assert.deepEqual(
          yield* service.member(organizationId, userId),
          Option.some(OrganizationMember.make({ organizationId, userId, roles })),
        );
      }),
    );

    it.effect("looks up the explicit organization/user pair without a session", () =>
      Effect.gen(function* () {
        const { service } = yield* membershipFixture;
        assert.isNull(yield* service.authenticate);
        assert.deepEqual(
          yield* service.member(organizationId, userId),
          Option.some(OrganizationMember.make({ organizationId, userId, roles: ["owner"] })),
        );
        assert.deepEqual(yield* service.listOrganizations(userId), [
          { id: organizationId, name: "Engine", slug: "engine" },
        ]);
        assert.deepEqual(yield* service.listOrganizations(UserId.make("other")), []);
        assert.isTrue(Option.isNone(yield* service.member(OrganizationId.make("other"), userId)));
        assert.isTrue(Option.isNone(yield* service.member(organizationId, UserId.make("other"))));
      }),
    );

    it.effect("shares membership within a request and observes revocation in the next", () =>
      Effect.gen(function* () {
        const { database, service, authentication } = yield* membershipFixture;
        const [first, concurrent] = yield* Effect.all(
          [service.member(organizationId, userId), service.member(organizationId, userId)],
          { concurrency: "unbounded" },
        );
        assert.isTrue(Option.isSome(first));
        assert.strictEqual(concurrent, first);
        yield* Effect.promise(() => database.delete(authSchema.member));
        assert.strictEqual(yield* service.member(organizationId, userId), first);
        const nextRequest = yield* authentication(request("/organizations"));
        assert.isTrue(Option.isNone(yield* nextRequest.member(organizationId, userId)));
        assert.deepEqual(yield* nextRequest.listOrganizations(userId), []);
      }),
    );

    it.effect("keeps absent membership request-local when a membership is added", () =>
      Effect.gen(function* () {
        const { database, service, authentication } = yield* membershipFixture;
        yield* Effect.promise(() => database.delete(authSchema.member));
        assert.isTrue(Option.isNone(yield* service.member(organizationId, userId)));
        yield* Effect.promise(() =>
          database.insert(authSchema.member).values({
            id: "replacement-member",
            organizationId,
            userId,
            role: "member",
            createdAt,
          }),
        );
        assert.isTrue(Option.isNone(yield* service.member(organizationId, userId)));
        const nextRequest = yield* authentication(request("/organizations"));
        assert.deepEqual(
          yield* nextRequest.member(organizationId, userId),
          Option.some(OrganizationMember.make({ organizationId, userId, roles: ["member"] })),
        );
      }),
    );

    it.effect.each(["unsupported", "", "owner,unsupported"])(
      "rejects malformed provider roles instead of granting access: %s",
      (role) =>
        Effect.gen(function* () {
          const { database, service } = yield* membershipFixture;
          yield* Effect.promise(() => database.update(authSchema.member).set({ role }));
          assert.instanceOf(
            yield* service.member(organizationId, userId).pipe(Effect.flip),
            OrganizationMembership.Unavailable,
          );
        }),
    );

    it.effect("preserves a database failure as Unavailable rather than missing membership", () =>
      Effect.gen(function* () {
        const { database, service } = yield* membershipFixture;
        yield* Effect.promise(() => database.execute(sql`drop table member`));
        const unavailable = yield* service.member(organizationId, userId).pipe(Effect.flip);
        assert.instanceOf(unavailable, OrganizationMembership.Unavailable);
        assert.strictEqual(
          yield* service.member(organizationId, userId).pipe(Effect.flip),
          unavailable,
        );
        const failure = yield* service.listOrganizations(userId).pipe(Effect.flip);
        assert.instanceOf(failure, Authentication.OrganizationsUnavailable);
        assert.instanceOf(failure.cause, Error);
      }),
    );
  });

  it.effect("settles provider work before interruption releases request resources", () =>
    Effect.gen(function* () {
      const auth = yield* fixture;
      const reading = Promise.withResolvers<void>();
      const releaseBody = Promise.withResolvers<void>();
      const body = new ReadableStream<Uint8Array>(
        {
          pull(controller) {
            reading.resolve();
            return releaseBody.promise.then(() => {
              controller.enqueue(new TextEncoder().encode(signUpBody));
              controller.close();
            });
          },
        },
        { highWaterMark: 0 },
      );
      const service = yield* auth.authentication(
        request("/api/auth/sign-up/email", {
          method: "POST",
          headers: { "content-type": "application/json", origin: baseURL.origin },
          body,
          duplex: "half",
        }),
      );
      let released = false;
      const operation = yield* Effect.gen(function* () {
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            released = true;
          }),
        );
        return yield* service.handle;
      }).pipe(Effect.scoped, Effect.forkChild);
      yield* Effect.promise(() => reading.promise);
      const interruption = yield* Fiber.interrupt(operation).pipe(Effect.forkChild);
      yield* Effect.yieldNow;
      assert.isFalse(released);
      releaseBody.resolve();
      yield* Fiber.join(interruption);
      assert.isTrue(released);
      const users = yield* Effect.promise(() => auth.database.select().from(authSchema.user));
      assert.lengthOf(users, 1);
    }),
  );

  it.effect("handles sign-up and projects the provider session", () =>
    Effect.gen(function* () {
      const auth = yield* fixture;
      const identity = yield* auth.authenticate(yield* auth.signUp());

      const users = yield* Effect.promise(() =>
        auth.database
          .select({ id: authSchema.user.id })
          .from(authSchema.user)
          .where(eq(authSchema.user.email, "ada@example.com")),
      );
      assert.lengthOf(users, 1);

      assert.deepEqual(identity, {
        principal: { userId: users[0]?.id },
        viewer: { name: "Ada Lovelace", email: "ada@example.com" },
      });
    }),
  );

  it.effect("caches within one request and reads state again on the next request", () =>
    Effect.gen(function* () {
      const auth = yield* fixture;
      const cookie = yield* auth.signUp();
      const headers = new Headers({ cookie });
      const service = yield* auth.authentication(request("/organizations", { headers }));

      const first = yield* service.authenticate;
      yield* Effect.promise(() => auth.database.delete(authSchema.session));

      assert.deepEqual(yield* service.authenticate, first);
      assert.isNull(yield* auth.authenticate(cookie));
    }),
  );

  it.effect("fails closed when provider data is invalid", () =>
    Effect.gen(function* () {
      const auth = yield* fixture;
      const cookie = yield* auth.signUp();
      yield* Effect.promise(() =>
        auth.database
          .update(authSchema.user)
          .set({ email: "invalid" })
          .where(eq(authSchema.user.email, "ada@example.com")),
      );

      const result = yield* Effect.result(auth.authenticate(cookie));
      assert.isTrue(Result.isFailure(result));
      if (Result.isFailure(result)) {
        assert.instanceOf(result.failure, Authentication.Unavailable);
        assert.isTrue(Schema.isSchemaError(result.failure.cause));
      }
    }),
  );

  it.effect(
    "validates organization handles at the provider boundary and preserves identity on rename",
    () =>
      Effect.gen(function* () {
        const auth = yield* fixture;
        const cookie = yield* auth.signUp();
        const call = Effect.fnUntraced(function* (
          path: string,
          body:
            | { readonly name: string; readonly slug: string }
            | {
                readonly organizationId: string;
                readonly data: { readonly name?: string; readonly slug?: string };
              },
        ) {
          const encoded = yield* Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown))(body);
          const service = yield* auth.authentication(
            request(`/api/auth/organization/${path}`, {
              method: "POST",
              headers: { "content-type": "application/json", origin: baseURL.origin, cookie },
              body: encoded,
            }),
          );
          return yield* service.handle;
        });
        const originalSlug = "a".repeat(48);
        const created = yield* call("create", { name: "Engine", slug: originalSlug });
        assert.strictEqual(created.status, 200);
        const organization = yield* Effect.promise(() => created.json()).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ id: OrganizationId }))),
        );
        for (const slug of [
          "Uppercase",
          " leading",
          "trailing\n",
          "two--hyphens",
          "-leading",
          "trailing-",
          "a/b",
          "a".repeat(49),
        ]) {
          for (const [path, body] of [
            ["create", { name: "Invalid", slug }],
            ["update", { organizationId: organization.id, data: { slug } }],
          ] as const) {
            const response = yield* call(path, body);
            assert.strictEqual(response.status, 400);
            const failure = yield* Effect.promise(() => response.json()).pipe(
              Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ code: Schema.String }))),
            );
            assert.strictEqual(failure.code, "INVALID_ORGANIZATION_SLUG");
          }
        }
        const rows = yield* Effect.promise(() =>
          auth.database.select().from(authSchema.organization),
        );
        assert.lengthOf(rows, 1);
        assert.strictEqual(rows[0]?.slug, originalSlug);

        assert.strictEqual(
          (yield* call("update", {
            organizationId: organization.id,
            data: { name: "Analytical Engine" },
          })).status,
          200,
        );
        assert.strictEqual(
          (yield* call("update", {
            organizationId: organization.id,
            data: { slug: "analytical-engine" },
          })).status,
          200,
        );
        const service = yield* auth.authentication(
          request("/organizations", { headers: { cookie } }),
        );
        const identity = yield* AuthGuard.requireIdentity.pipe(
          Effect.provideService(Authentication.Service, service),
        );
        assert.deepEqual(yield* service.listOrganizations(identity.principal.userId), [
          {
            id: organization.id,
            name: "Analytical Engine",
            slug: "analytical-engine",
          },
        ]);
        const members = yield* Effect.promise(() => auth.database.select().from(authSchema.member));
        assert.lengthOf(members, 1);
        assert.strictEqual(members[0]?.organizationId, organization.id);
      }),
  );

  it.effect(
    "creates organizations with owner membership and rejects another user's selection",
    () =>
      Effect.gen(function* () {
        const auth = yield* fixture;
        const cookie = yield* auth.signUp();
        const call = Effect.fnUntraced(function* (
          path: string,
          body: Readonly<Record<string, string>>,
          session = cookie,
        ) {
          const service = yield* auth.authentication(
            request(`/api/auth/organization/${path}`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                origin: baseURL.origin,
                cookie: session,
              },
              body: encodeBody(body),
            }),
          );
          return yield* service.handle;
        });
        const created = yield* call("create", {
          name: "Analytical Engine",
          slug: "analytical-engine",
        });
        assert.strictEqual(created.status, 200);
        const organization = yield* Effect.promise(() => created.json()).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(Schema.Struct({ id: Schema.String }))),
        );
        const members = yield* Effect.promise(() => auth.database.select().from(authSchema.member));
        assert.lengthOf(members, 1);
        assert.strictEqual(members[0]?.role, "owner");
        assert.strictEqual(members[0]?.organizationId, organization.id);

        assert.strictEqual(
          (yield* call("set-active", { organizationId: organization.id })).status,
          200,
        );
        const other = yield* auth.authentication(
          request("/api/auth/sign-up/email", {
            method: "POST",
            headers: { "content-type": "application/json", origin: baseURL.origin },
            body: encodeBody({
              name: "Grace",
              email: "grace@example.com",
              password: "correct-horse-battery-staple",
            }),
          }),
        );
        const response = yield* other.handle;
        assert.strictEqual(response.status, 200);
        const otherCookie = response.headers
          .getSetCookie()
          .map((value) => value.split(";")[0])
          .join("; ");
        assert.strictEqual(
          (yield* call("set-active", { organizationId: organization.id }, otherCookie)).status,
          403,
        );
      }),
  );
});
