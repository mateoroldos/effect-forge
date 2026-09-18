import { assert, describe, it } from "@effect/vitest";
import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { PgliteDatabase } from "@effect-forge/database-postgres/test/pglite-database";
import { eq } from "drizzle-orm";
import { Effect, Fiber, Redacted, Result, Schema } from "effect";
import { Authentication } from "./authentication.ts";

const baseURL = new URL("http://localhost:5173");
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
    const service = yield* authentication(request("/workspaces", { headers }));
    return yield* service.authenticate;
  });

  return { authenticate, authentication, database, signUp };
});

describe("Authentication", () => {
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
      const service = yield* auth.authentication(request("/workspaces", { headers }));

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
        assert.deepEqual(result.failure, new Authentication.Unavailable({}));
      }
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
