import { assert, describe, it } from "@effect/vitest";
import { OrganizationId } from "@effect-forge/domain/organization";
import { Todo, TodoId, TodoTitle } from "@effect-forge/domain/todo";
import { Effect } from "effect";
import { TodoStore } from "./todo-store.ts";
import { TodoStoreMemory } from "./todo-store-memory.ts";

const todo = Todo.make({
  id: TodoId.make("550e8400-e29b-41d4-a716-446655440000"),
  organizationId: OrganizationId.make("org-a"),
  title: TodoTitle.make("Ship organizations"),
  completed: false,
});

describe("TodoStoreMemory", () => {
  it.effect("rejects duplicate IDs without overwriting the existing todo", () =>
    Effect.gen(function* () {
      const store = yield* TodoStore.Service;
      yield* store.create(todo);
      const duplicate = Todo.make({ ...todo, title: TodoTitle.make("Overwrite") });
      assert.instanceOf(
        yield* store.create(duplicate).pipe(Effect.flip),
        TodoStore.PersistenceError,
      );
      assert.deepEqual(yield* store.list(todo.organizationId), [todo]);
    }).pipe(Effect.provide(TodoStoreMemory.layer)),
  );
  it.effect("scopes reads and rejects foreign or missing todo updates", () =>
    Effect.gen(function* () {
      const store = yield* TodoStore.Service;
      const other = OrganizationId.make("org-b");
      const missing = TodoId.make("550e8400-e29b-41d4-a716-446655440001");
      yield* store.create(todo);
      assert.deepEqual(yield* store.list(other), []);
      assert.deepEqual(
        yield* store.setCompleted(other, todo.id, true).pipe(Effect.flip),
        new TodoStore.NotFound({ organizationId: other, id: todo.id }),
      );
      assert.deepEqual(
        yield* store.setCompleted(todo.organizationId, missing, true).pipe(Effect.flip),
        new TodoStore.NotFound({ organizationId: todo.organizationId, id: missing }),
      );
      assert.deepEqual(yield* store.list(todo.organizationId), [todo]);
    }).pipe(Effect.provide(TodoStoreMemory.layer)),
  );
});
