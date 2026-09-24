# Web request runtime

Read this for resource lifetime, authentication, or cancellation changes.
For handlers, start with [application operations](observability.md#application-operations).

## Owners

| Source                                                   | Owns                                                 |
| -------------------------------------------------------- | ---------------------------------------------------- |
| [runtime.ts](../src/lib/server/runtime.ts)               | Request composition, lazy acquisition, parent span   |
| [request-runner.ts](../src/lib/server/request-runner.ts) | Execution, cancellation, cause handling              |
| [postgres.ts](../src/lib/server/postgres.ts)             | Separate auth and application database clients       |
| [authentication.ts](../src/lib/server/authentication.ts) | Provider calls and request-local identity/membership |
| [hooks.server.ts](../src/hooks.server.ts)                | Request integration, error reporting, cleanup        |

## Lifetime and identity

`locals.run` acquires the runtime on first use. After response work settles, the
hook schedules disposal with `ctx.waitUntil`. Keep runtime-dependent work out of
streamed response bodies.

Database clients are request-scoped. Separate auth and application clients prevent
their transactions from interleaving. Let Better Auth promises settle before
interruption releases their resources; keep its background-capable work awaited.

Identity and membership caches belong to one request. A new request bypasses the
provider cookie cache and reads the session again. Protected reads disable session
refresh; ordinary page activity does not extend Better Auth's default seven-day
lifetime. Principal and organization IDs remain explicit operation inputs.

## Result and cause boundary

Only a single typed failure becomes `Result.Failure`. Defects, interruptions,
multiple failures, and acquisition failures reject with the full cause in
`Error.cause`. Keep `runPromiseExit`: `Effect.result` can select a typed failure
from a mixed cause, and `runPromise` can discard cause detail.

Already-aborted requests never enter acquisition or the operation. Acquisition
failures also have no operation summary. The error hook suppresses fallback logs
only for aborted requests with interruption-only causes, never mixed or unknown errors.

## Verify

Use [runner](../src/lib/server/request-runner.test.ts),
[hook](../src/hooks.server.test.ts), and [auth](../src/lib/server/authentication.test.ts)
tests. Cover success, failure, interruption during work, and cleanup.
Check Cloudflare `waitUntil`, sockets, and exporter delivery separately;
local tests do not establish those behaviors.
