import { TodoDirectory } from "@effect-forge/core/todo-directory";
import { OrganizationId } from "@effect-forge/domain/organization";
import { type Todo, TodoId, TodoTitle } from "@effect-forge/domain/todo";
import { error } from "@sveltejs/kit";
import { form, getRequestEvent, query } from "$app/server";
import { Effect, Match, Result, Schema } from "effect";
import { Authentication } from "#lib/server/authentication.ts";
import { AuthGuard } from "#lib/server/auth-guard.ts";

type Failure =
  | AuthGuard.Unauthenticated
  | Authentication.Unavailable
  | Effect.Error<ReturnType<TodoDirectory.Interface["list"]>>
  | Effect.Error<ReturnType<TodoDirectory.Interface["create"]>>
  | Effect.Error<ReturnType<TodoDirectory.Interface["setCompleted"]>>;

// The query also renders optimistic titles before the server assigns their IDs.
export type TodoListItem = Todo | { readonly id: null; readonly title: string };

const reject = (failure: Failure): never =>
  Match.valueTags(failure, {
    "AuthGuard.Unauthenticated": (failure) => AuthGuard.reject(failure),
    "Authentication.Unavailable": (failure) => AuthGuard.reject(failure),
    "OrganizationMembership.Unavailable": () =>
      error(503, "We couldn’t verify organization access. Please try again."),
    "OrganizationAccess.Denied": () => error(403, "You don’t have access to these todos."),
    "TodoStore.NotFound": () => error(404, "This todo is no longer available."),
    "TodoStore.PersistenceError": () =>
      error(500, "We couldn’t confirm the result. Refresh before trying again."),
    "TodoDirectory.IdGenerationError": () =>
      error(500, "We couldn’t create your todo. Refresh before trying again."),
  });

export const listTodos = query(
  Schema.toStandardSchemaV1(OrganizationId),
  (organizationId): Promise<ReadonlyArray<TodoListItem>> =>
    getRequestEvent()
      .locals.run(
        "Remote.listTodos",
        Effect.gen(function* () {
          const { principal } = yield* AuthGuard.requireIdentity;
          const directory = yield* TodoDirectory.Service;
          const todos = yield* directory.list(principal, organizationId);
          yield* Effect.annotateCurrentSpan("todo.count", todos.length);
          return todos;
        }),
      )
      .then(Result.getOrElse(reject)),
);

export const createTodo = form(
  Schema.toStandardSchemaV1(
    Schema.Struct({
      organizationId: OrganizationId,
      title: TodoTitle,
    }),
  ),
  (input) =>
    getRequestEvent()
      .locals.run(
        "Remote.createTodo",
        Effect.gen(function* () {
          const { principal } = yield* AuthGuard.requireIdentity;
          const directory = yield* TodoDirectory.Service;
          return yield* directory.create(principal, input.organizationId, input.title);
        }),
      )
      .then(Result.getOrElse(reject))
      .then(() => listTodos(input.organizationId).refresh()),
);

export const setTodoCompleted = form(
  Schema.toStandardSchemaV1(
    Schema.Struct({
      organizationId: OrganizationId,
      id: TodoId,
      completed: Schema.Literals(["true", "false"]),
    }),
  ),
  (input) =>
    getRequestEvent()
      .locals.run(
        "Remote.setTodoCompleted",
        Effect.gen(function* () {
          const { principal } = yield* AuthGuard.requireIdentity;
          const directory = yield* TodoDirectory.Service;
          return yield* directory.setCompleted(
            principal,
            input.organizationId,
            input.id,
            input.completed === "true",
          );
        }),
      )
      .then(Result.getOrElse(reject))
      .then(() => listTodos(input.organizationId).refresh()),
);
