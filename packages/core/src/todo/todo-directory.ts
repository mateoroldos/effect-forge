import type { Principal } from "@effect-forge/domain/identity";
import type { OrganizationId } from "@effect-forge/domain/organization";
import { Todo, TodoDescription, TodoId, TodoTitle } from "@effect-forge/domain/todo";
import { Context, Crypto, Effect, Layer, Schema } from "effect";
import { OrganizationAccess } from "../organization-access/organization-access.ts";
import type { OrganizationMembership } from "../organization-access/organization-membership.ts";
import { Permission } from "../organization-access/permission.ts";
import { TodoStore } from "./todo-store.ts";

const permissions = {
  list: Permission.define({ key: "todo:list", grantedTo: ["admin", "member"] }),
  create: Permission.define({ key: "todo:create", grantedTo: ["admin", "member"] }),
  update: Permission.define({ key: "todo:update", grantedTo: ["admin", "member"] }),
};

type AccessError = OrganizationAccess.Denied | OrganizationMembership.Unavailable;
export interface Interface {
  readonly list: (
    principal: Principal,
    organizationId: OrganizationId,
  ) => Effect.Effect<ReadonlyArray<Todo>, AccessError | TodoStore.PersistenceError>;
  readonly create: (
    principal: Principal,
    organizationId: OrganizationId,
    title: TodoTitle,
    description: TodoDescription,
  ) => Effect.Effect<Todo, AccessError | IdGenerationError | TodoStore.PersistenceError>;
  readonly setCompleted: (
    principal: Principal,
    organizationId: OrganizationId,
    id: TodoId,
    completed: boolean,
  ) => Effect.Effect<Todo, AccessError | TodoStore.NotFound | TodoStore.PersistenceError>;
}

export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/TodoDirectory",
) {}

export class IdGenerationError extends Schema.TaggedError<IdGenerationError>()(
  "TodoDirectory.IdGenerationError",
  {
    cause: Schema.Defect(),
  },
) {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const access = yield* OrganizationAccess.Service;
    const store = yield* TodoStore.Service;
    const crypto = yield* Crypto.Crypto;

    const list = Effect.fn("TodoDirectory.list")(function* (
      principal: Principal,
      organizationId: OrganizationId,
    ) {
      yield* access.require(principal, organizationId, permissions.list);
      return yield* store.list(organizationId);
    });
    const create = Effect.fn("TodoDirectory.create")(function* (
      principal: Principal,
      organizationId: OrganizationId,
      title: TodoTitle,
      description: TodoDescription,
    ) {
      yield* access.require(principal, organizationId, permissions.create);
      const id = yield* crypto.randomUUIDv4.pipe(
        Effect.flatMap(Schema.decodeEffect(TodoId)),
        Effect.mapError((cause) => new IdGenerationError({ cause })),
      );
      return yield* store.create(
        Todo.make({ id, organizationId, title, description, completed: false }),
      );
    });
    const setCompleted = Effect.fn("TodoDirectory.setCompleted")(function* (
      principal: Principal,
      organizationId: OrganizationId,
      id: TodoId,
      completed: boolean,
    ) {
      yield* access.require(principal, organizationId, permissions.update);
      return yield* store.setCompleted(organizationId, id, completed);
    });
    return Service.of({ list, create, setCompleted });
  }),
).pipe(Layer.provide(OrganizationAccess.layer));

export * as TodoDirectory from "./todo-directory.ts";
