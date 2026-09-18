import { OrganizationId } from "@effect-forge/domain/organization";
import { Todo, TodoId } from "@effect-forge/domain/todo";
import { Context, Effect, Schema } from "effect";

export interface Interface {
  readonly create: (todo: Todo) => Effect.Effect<Todo, PersistenceError>;
  readonly list: (
    organizationId: OrganizationId,
  ) => Effect.Effect<ReadonlyArray<Todo>, PersistenceError>;
  readonly setCompleted: (
    organizationId: OrganizationId,
    id: TodoId,
    completed: boolean,
  ) => Effect.Effect<Todo, NotFound | PersistenceError>;
}

export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/TodoStore",
) {}

export class NotFound extends Schema.TaggedError<NotFound>()("TodoStore.NotFound", {
  organizationId: OrganizationId,
  id: TodoId,
}) {}

export class PersistenceError extends Schema.TaggedError<PersistenceError>()(
  "TodoStore.PersistenceError",
  {
    cause: Schema.Defect(),
  },
) {}

export * as TodoStore from "./todo-store.ts";
