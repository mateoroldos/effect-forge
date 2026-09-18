import { TodoStore } from "@effect-forge/core/todo-store";
import type { OrganizationId } from "@effect-forge/domain/organization";
import { Todo, type TodoId } from "@effect-forge/domain/todo";
import { and, asc, eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { Database } from "../internal/database.ts";
import { todos } from "./schema.ts";

const columns = {
  id: todos.id,
  organizationId: todos.organizationId,
  title: todos.title,
  completed: todos.completed,
};

export const layer = Layer.effect(
  TodoStore.Service,
  Effect.gen(function* () {
    const database = yield* Database.Service;
    const create = Effect.fn("TodoStorePostgres.create")((todo: Todo) =>
      database
        .insert(todos)
        .values(todo)
        .pipe(
          Effect.as(todo),
          Effect.mapError((cause) => new TodoStore.PersistenceError({ cause })),
        ),
    );
    const list = Effect.fn("TodoStorePostgres.list")((organizationId: OrganizationId) =>
      database
        .select(columns)
        .from(todos)
        .where(eq(todos.organizationId, organizationId))
        .orderBy(asc(todos.createdAt), asc(todos.id))
        .pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Todo))),
          Effect.mapError((cause) => new TodoStore.PersistenceError({ cause })),
        ),
    );
    const setCompleted = Effect.fn("TodoStorePostgres.setCompleted")(function* (
      organizationId: OrganizationId,
      id: TodoId,
      completed: boolean,
    ) {
      const rows = yield* database
        .update(todos)
        .set({ completed })
        .where(and(eq(todos.organizationId, organizationId), eq(todos.id, id)))
        .returning(columns)
        .pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Todo))),
          Effect.mapError((cause) => new TodoStore.PersistenceError({ cause })),
        );
      const todo = rows[0];
      if (todo === undefined) return yield* new TodoStore.NotFound({ organizationId, id });
      return todo;
    });
    return TodoStore.Service.of({ create, list, setCompleted });
  }),
);

export * as TodoStorePostgres from "./todo-store-postgres.ts";
