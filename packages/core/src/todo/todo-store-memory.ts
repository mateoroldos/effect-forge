import { Todo, type TodoId } from "@effect-forge/domain/todo";
import { Effect, Layer, Ref } from "effect";
import { TodoStore } from "./todo-store.ts";

/** Provides atomic in-memory todo persistence for tests. */
export const layer = Layer.effect(
  TodoStore.Service,
  Effect.gen(function* () {
    const state = yield* Ref.make(new Map<TodoId, Todo>());
    return TodoStore.Service.of({
      create: (todo) =>
        Ref.modify(
          state,
          (rows): readonly [Effect.Effect<Todo, TodoStore.PersistenceError>, Map<TodoId, Todo>] =>
            rows.has(todo.id)
              ? [
                  Effect.fail(
                    new TodoStore.PersistenceError({ cause: new Error("Duplicate todo ID") }),
                  ),
                  rows,
                ]
              : [Effect.succeed(todo), new Map(rows).set(todo.id, todo)],
        ).pipe(Effect.flatten),
      list: (organizationId) =>
        Ref.get(state).pipe(
          Effect.map((rows) =>
            [...rows.values()].filter((todo) => todo.organizationId === organizationId),
          ),
        ),
      setCompleted: (organizationId, id, completed) =>
        Ref.modify(
          state,
          (rows): readonly [Effect.Effect<Todo, TodoStore.NotFound>, Map<TodoId, Todo>] => {
            const previous = rows.get(id);
            if (previous === undefined || previous.organizationId !== organizationId)
              return [Effect.fail(new TodoStore.NotFound({ organizationId, id })), rows];
            const todo = Todo.make({
              id,
              organizationId,
              title: previous.title,
              description: previous.description,
              completed,
            });
            return [Effect.succeed(todo), new Map(rows).set(id, todo)];
          },
        ).pipe(Effect.flatten),
    });
  }),
);

export * as TodoStoreMemory from "./todo-store-memory.ts";
