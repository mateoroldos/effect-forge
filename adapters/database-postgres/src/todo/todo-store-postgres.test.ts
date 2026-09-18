import { assert, describe, it } from "@effect/vitest";
import { TodoStore } from "@effect-forge/core/todo-store";
import { OrganizationId } from "@effect-forge/domain/organization";
import { Todo, TodoId, TodoTitle } from "@effect-forge/domain/todo";
import { eq } from "drizzle-orm";
import { DateTime, Effect, Layer } from "effect";
import { organization } from "../auth/schema.ts";
import { Database } from "../internal/database.ts";
import { PersistencePglite } from "../test/persistence-pglite.ts";
import { todos } from "./schema.ts";

const orgA = OrganizationId.make("org-a");
const orgB = OrganizationId.make("org-b");
const createdAt = DateTime.toDateUtc(DateTime.makeUnsafe(0));
const todo = Todo.make({
  id: TodoId.make("550e8400-e29b-41d4-a716-446655440000"),
  organizationId: orgA,
  title: TodoTitle.make("Ship organizations"),
  completed: false,
});
const sibling = Todo.make({ ...todo, id: TodoId.make("550e8400-e29b-41d4-a716-446655440001") });
const foreign = Todo.make({
  ...todo,
  id: TodoId.make("550e8400-e29b-41d4-a716-446655440002"),
  organizationId: orgB,
});
const layer = PersistencePglite.layer.pipe(Layer.provideMerge(PersistencePglite.databaseLayer));
const fixture = Effect.gen(function* () {
  const database = yield* Database.Service;
  const store = yield* TodoStore.Service;
  yield* database.insert(organization).values([
    { id: orgA, name: "A", slug: "a", createdAt },
    { id: orgB, name: "B", slug: "b", createdAt },
  ]);
  return { database, store };
});

describe("PostgreSQL TodoStore", () => {
  it.effect("persists creation, repeated completion, and reopening", () =>
    Effect.gen(function* () {
      const { store } = yield* fixture;
      assert.deepEqual(yield* store.create(todo), todo);
      assert.deepEqual(yield* store.list(orgA), [todo]);
      const done = { ...todo, completed: true };
      assert.deepEqual(yield* store.setCompleted(orgA, todo.id, true), done);
      assert.deepEqual(yield* store.setCompleted(orgA, todo.id, true), done);
      assert.deepEqual(yield* store.list(orgA), [done]);
      assert.deepEqual(yield* store.setCompleted(orgA, todo.id, false), todo);
      assert.deepEqual(yield* store.list(orgA), [todo]);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("lists only the requested organization's todos", () =>
    Effect.gen(function* () {
      const { store } = yield* fixture;
      yield* store.create(todo);
      yield* store.create(foreign);
      assert.deepEqual(yield* store.list(orgA), [todo]);
      assert.deepEqual(yield* store.list(orgB), [foreign]);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("updates only the requested todo within its organization", () =>
    Effect.gen(function* () {
      const { store } = yield* fixture;
      for (const row of [todo, sibling, foreign]) yield* store.create(row);
      assert.deepEqual(yield* store.setCompleted(orgA, todo.id, true), {
        ...todo,
        completed: true,
      });
      assert.sameDeepMembers(
        [...(yield* store.list(orgA))],
        [{ ...todo, completed: true }, sibling],
      );
      assert.deepEqual(yield* store.list(orgB), [foreign]);
      assert.deepEqual(
        yield* store.setCompleted(orgA, foreign.id, true).pipe(Effect.flip),
        new TodoStore.NotFound({ organizationId: orgA, id: foreign.id }),
      );
      const missingId = TodoId.make("550e8400-e29b-41d4-a716-446655440003");
      assert.deepEqual(
        yield* store.setCompleted(orgA, missingId, false).pipe(Effect.flip),
        new TodoStore.NotFound({ organizationId: orgA, id: missingId }),
      );
      assert.sameDeepMembers(
        [...(yield* store.list(orgA))],
        [{ ...todo, completed: true }, sibling],
      );
      assert.deepEqual(yield* store.list(orgB), [foreign]);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("cascades organization deletion without removing another organization's todos", () =>
    Effect.gen(function* () {
      const { database, store } = yield* fixture;
      yield* store.create(todo);
      yield* store.create(foreign);
      yield* database.delete(organization).where(eq(organization.id, orgA));
      assert.deepEqual(yield* store.list(orgA), []);
      assert.deepEqual(yield* store.list(orgB), [foreign]);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("translates a database constraint failure into PersistenceError", () =>
    Effect.gen(function* () {
      const { store } = yield* fixture;
      yield* store.create(todo);
      assert.instanceOf(yield* store.create(todo).pipe(Effect.flip), TodoStore.PersistenceError);
      assert.deepEqual(yield* store.list(orgA), [todo]);
    }).pipe(Effect.provide(layer)),
  );

  it.effect("rejects malformed persisted rows with PersistenceError", () =>
    Effect.gen(function* () {
      const { database, store } = yield* fixture;
      yield* database.insert(todos).values({ ...todo, title: "" });
      assert.instanceOf(yield* store.list(orgA).pipe(Effect.flip), TodoStore.PersistenceError);
    }).pipe(Effect.provide(layer)),
  );
});
