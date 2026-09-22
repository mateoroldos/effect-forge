import { Schema } from "effect";
import { OrganizationId } from "../organization/organization.ts";

export const TodoId = Schema.String.pipe(Schema.check(Schema.isUUID(4)), Schema.brand("TodoId"));
export type TodoId = typeof TodoId.Type;

export const TodoTitle = Schema.String.pipe(
  Schema.check(Schema.isTrimmed(), Schema.isMinLength(1), Schema.isMaxLength(200)),
  Schema.brand("TodoTitle"),
);
export type TodoTitle = typeof TodoTitle.Type;

export const TodoDescription = Schema.String.pipe(
  Schema.check(Schema.isMaxLength(2000)),
  Schema.brand("TodoDescription"),
);
export type TodoDescription = typeof TodoDescription.Type;

export const Todo = Schema.Struct({
  id: TodoId,
  organizationId: OrganizationId,
  title: TodoTitle,
  description: TodoDescription,
  completed: Schema.Boolean,
});
export interface Todo extends Schema.Schema.Type<typeof Todo> {}
