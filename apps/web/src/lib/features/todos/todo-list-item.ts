import type { Todo } from "@effect-forge/domain/todo";

export type TodoListItem =
  | Todo
  | { readonly id: null; readonly title: string; readonly description: string };
