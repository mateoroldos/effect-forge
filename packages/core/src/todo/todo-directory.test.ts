import { assert, describe, it } from "@effect/vitest";
import { Principal, UserId } from "@effect-forge/domain/identity";
import { OrganizationId, OrganizationMember } from "@effect-forge/domain/organization";
import { TodoDescription, TodoId, TodoTitle } from "@effect-forge/domain/todo";
import { Effect, Layer, Option, PlatformError, Ref } from "effect";
import { OrganizationAccess } from "../organization-access/organization-access.ts";
import { OrganizationMembership } from "../organization-access/organization-membership.ts";
import { Permission } from "../organization-access/permission.ts";
import { CryptoDeterministic } from "../test/crypto-deterministic.ts";
import { TodoDirectory } from "./todo-directory.ts";
import { TodoStore } from "./todo-store.ts";
import { TodoStoreMemory } from "./todo-store-memory.ts";

const organizationId = OrganizationId.make("org-1");
const principal = Principal.make({ userId: UserId.make("user-1") });
const colleague = Principal.make({ userId: UserId.make("user-2") });
const title = TodoTitle.make("Ship organizations");
const description = TodoDescription.make("Review the changes.\nThen ship them.");
const emptyDescription = TodoDescription.make("");
const members = [principal, colleague].map(({ userId }) =>
  OrganizationMember.make({ organizationId, userId, roles: ["member"] }),
);
const memberships = Layer.succeed(OrganizationMembership.Service, {
  member: (orgId, userId) =>
    Effect.succeed(
      Option.fromUndefinedOr(
        members.find((member) => member.organizationId === orgId && member.userId === userId),
      ),
    ),
});
const testLayer = TodoDirectory.layer.pipe(
  Layer.provideMerge(Layer.mergeAll(CryptoDeterministic.layer, TodoStoreMemory.layer, memberships)),
);
const cryptoError = PlatformError.badArgument({
  module: "Crypto",
  method: "randomUUIDv4",
  description: "failed",
});
const failureLayer = TodoDirectory.layer.pipe(
  Layer.provideMerge(
    Layer.mergeAll(
      CryptoDeterministic.randomUUIDFailureLayer(cryptoError),
      TodoStoreMemory.layer,
      memberships,
    ),
  ),
);

describe("TodoDirectory", () => {
  it.layer(testLayer)("shared organization todos", (it) => {
    it.effect("creates distinct todos and lets another member complete them", () =>
      Effect.gen(function* () {
        const directory = yield* TodoDirectory.Service;
        const first = yield* directory.create(principal, organizationId, title, description);
        const second = yield* directory.create(colleague, organizationId, title, emptyDescription);
        assert.notStrictEqual(first.id, second.id);
        assert.deepEqual(first, {
          id: first.id,
          organizationId,
          title,
          description,
          completed: false,
        });
        assert.deepEqual(second, {
          id: second.id,
          organizationId,
          title,
          description: emptyDescription,
          completed: false,
        });
        assert.sameDeepMembers(
          [...(yield* directory.list(colleague, organizationId))],
          [first, second],
        );
        const done = yield* directory.setCompleted(colleague, organizationId, first.id, true);
        const expected = { id: first.id, organizationId, title, description, completed: true };
        assert.deepEqual(done, expected);
        assert.sameDeepMembers(
          [...(yield* directory.list(principal, organizationId))],
          [expected, second],
        );
      }),
    );
  });

  it.effect("revoking one member denies persistence access while another retains access", () =>
    Effect.gen(function* () {
      const currentMembers = yield* Ref.make(members);
      const accesses = yield* Ref.make(0);
      const recordedStore = Layer.effect(
        TodoStore.Service,
        Effect.gen(function* () {
          const store = yield* TodoStore.Service;
          const recordAccess = Ref.update(accesses, (count) => count + 1);
          return TodoStore.Service.of({
            create: (todo) => recordAccess.pipe(Effect.andThen(store.create(todo))),
            list: (orgId) => recordAccess.pipe(Effect.andThen(store.list(orgId))),
            setCompleted: (orgId, id, completed) =>
              recordAccess.pipe(Effect.andThen(store.setCompleted(orgId, id, completed))),
          });
        }),
      ).pipe(Layer.provide(TodoStoreMemory.layer));
      const revocationLayer = TodoDirectory.layer.pipe(
        Layer.provideMerge(
          Layer.mergeAll(
            CryptoDeterministic.layer,
            recordedStore,
            Layer.succeed(OrganizationMembership.Service, {
              member: (orgId, userId) =>
                Ref.get(currentMembers).pipe(
                  Effect.map((rows) =>
                    Option.fromUndefinedOr(
                      rows.find(
                        (member) => member.organizationId === orgId && member.userId === userId,
                      ),
                    ),
                  ),
                ),
            }),
          ),
        ),
      );
      yield* Effect.gen(function* () {
        const directory = yield* TodoDirectory.Service;
        const store = yield* TodoStore.Service;
        const todo = yield* directory.create(principal, organizationId, title, description);
        yield* Ref.update(currentMembers, (rows) =>
          rows.filter((member) => member.userId !== principal.userId),
        );
        const before = yield* Ref.get(accesses);
        assert.deepEqual(
          yield* directory.list(principal, organizationId).pipe(Effect.flip),
          new OrganizationAccess.Denied({
            organizationId,
            permission: Permission.Key.make("todo:list"),
          }),
        );
        assert.deepEqual(
          yield* directory.create(principal, organizationId, title, description).pipe(Effect.flip),
          new OrganizationAccess.Denied({
            organizationId,
            permission: Permission.Key.make("todo:create"),
          }),
        );
        assert.deepEqual(
          yield* directory.setCompleted(principal, organizationId, todo.id, true).pipe(Effect.flip),
          new OrganizationAccess.Denied({
            organizationId,
            permission: Permission.Key.make("todo:update"),
          }),
        );
        assert.strictEqual(yield* Ref.get(accesses), before);
        assert.deepEqual(yield* store.list(organizationId), [todo]);
        const done = yield* directory.setCompleted(colleague, organizationId, todo.id, true);
        assert.deepEqual(done, {
          id: todo.id,
          organizationId,
          title,
          description,
          completed: true,
        });
        assert.deepEqual(yield* directory.list(colleague, organizationId), [done]);
      }).pipe(Effect.provide(revocationLayer));
    }),
  );

  it.layer(testLayer)("missing todo", (it) => {
    it.effect("preserves the store's missing-todo failure", () =>
      Effect.gen(function* () {
        const directory = yield* TodoDirectory.Service;
        const id = TodoId.make("550e8400-e29b-41d4-a716-446655440000");
        assert.deepEqual(
          yield* directory.setCompleted(principal, organizationId, id, true).pipe(Effect.flip),
          new TodoStore.NotFound({ organizationId, id }),
        );
      }),
    );
  });

  it.layer(failureLayer)("identifier generation", (it) => {
    it.effect("preserves Crypto failure context without creating a todo", () =>
      Effect.gen(function* () {
        const directory = yield* TodoDirectory.Service;
        const store = yield* TodoStore.Service;
        const failure = yield* directory
          .create(principal, organizationId, title, description)
          .pipe(Effect.flip);
        assert.instanceOf(failure, TodoDirectory.IdGenerationError);
        assert.strictEqual(failure.cause, cryptoError);
        assert.deepEqual(yield* store.list(organizationId), []);
      }),
    );
  });
});
