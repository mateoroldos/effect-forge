# Trace a todo

Follow one creation request to understand ownership. The links point to working
code; this page explains why each part lives there.

## Request path

The [Todo schema](../packages/domain/src/todo/todo.ts) defines valid persisted
values without framework or database dependencies.

| Step                                                     | Owner                                                                                 |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Collect input and show pending state                     | [TodoCreateForm](../apps/web/src/lib/features/todos/TodoCreateForm.svelte)            |
| Validate input, authenticate, and run core               | [createTodo remote function](../apps/web/src/lib/features/todos/todos.remote.ts)      |
| Check permission, generate identity, and call the store  | [TodoDirectory](../packages/core/src/todo/todo-directory.ts)                          |
| Resolve membership and permission                        | [OrganizationAccess](../packages/core/src/organization-access/organization-access.ts) |
| Define persistence values and expected failures          | [TodoStore port](../packages/core/src/todo/todo-store.ts)                             |
| Run scoped SQL, decode rows, and translate driver errors | [PostgreSQL adapter](../adapters/database-postgres/src/todo/todo-store-postgres.ts)   |
| Refresh the authoritative query after success            | [Remote functions](../apps/web/src/lib/features/todos/todos.remote.ts)                |

The hidden organization field is input, not authority. Core checks access before
touching the store; SQL retains organization scope, including updates by todo ID.

## Dependencies and failures

[Application.layer](../packages/core/src/application.ts) leaves dependencies open.
The [web runtime](../apps/web/src/lib/server/runtime.ts) supplies auth, persistence,
crypto, and telemetry; tests supply substitutes.

Better Auth's browser client uses its own same-origin handler. Application
permissions still belong to core. Remote functions map typed failures to safe
responses; driver causes remain private. [Trace the operation](../apps/web/docs/observability.md#investigating-an-operation)
through `Remote.createTodo`, `TodoDirectory.create`, and `TodoStorePostgres.create`.

## Optimistic presentation

The [presentation type](../apps/web/src/lib/features/todos/todo-list-item.ts) permits
an unsaved row with `id: null`; the domain type does not. The form adds it through
a query override, then clears the fields. Kit removes the override when submission settles.

Recovery restores submitted text into empty fields. Otherwise it leaves newer input
alone and offers **Restore text** to replace it with the submitted version.
[TodoItem](../apps/web/src/lib/features/todos/TodoItem.svelte)
disables actions on unsaved or pending rows. This is one worked example, not a
requirement for every feature. Follow the [recovery rules](../apps/web/docs/frontend.md#error-channels-and-recovery)
before retrying an uncertain write.

## Verify or extend

Tests cover [domain values](../packages/domain/src/todo/todo.test.ts),
[service permissions](../packages/core/src/todo/todo-directory.test.ts),
[SQL isolation](../adapters/database-postgres/src/todo/todo-store-postgres.test.ts), and
[auth integration](../apps/web/src/lib/server/authentication.test.ts).
[Browser checks](../apps/web/docs/frontend.md#verification) remain manual.

Use the [change workflow](../.agents/skills/effect-forge/SKILL.md) to extend the feature.
For another runtime, reuse the relevant core/domain contracts and supply new adapters.
