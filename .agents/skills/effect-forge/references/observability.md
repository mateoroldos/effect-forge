# Observability

## Application operations

Use `locals.run(name, program)` in remote functions, layouts, and endpoints. It
creates a native span and one completion summary, records tagged errors, returns
a typed `Result`, and binds request cancellation. Only a single typed failure becomes
`Result.Failure`. Defects, interruption, multiple failures, and runtime initialization
failures reject the Promise with the complete Effect cause retained in `Error.cause`.
An already-aborted request is rejected before runtime acquisition or operation entry,
so it emits no operation-completion summary.

Project the `Result` into application values or SvelteKit errors; do not return it
directly to the browser:

```ts
const result = await event.locals.run(
  "Remote.listTodos",
  Effect.gen(function* () {
    const directory = yield* TodoDirectory.Service;
    const todos = yield* directory.list(principal, organizationId);
    yield* Effect.annotateCurrentSpan("todo.count", todos.length);
    return todos;
  }),
);
if (Result.isFailure(result)) {
  return Match.valueTags(result.failure, {
    "OrganizationAccess.Denied": () => error(403, "You don’t have access to these todos."),
    "OrganizationMembership.Unavailable": () =>
      error(503, "We couldn’t verify organization access."),
    "TodoStore.PersistenceError": () => error(500, "We couldn’t load your todos."),
  });
}
return result.success;
```

- Add meaningful operation facts with `Effect.annotateCurrentSpan`; use named `Effect.fn` spans for internal work.
- Name boundary operations `Remote.<exported function>`, `Load.<route or layout purpose>`, or `Endpoint.<endpoint purpose>`, such as `Remote.createTodo`, `Load.authenticatedLayout`, and `Endpoint.authentication`. Internal operations retain their service-owner names, such as `TodoDirectory.create`.
- Reuse the runtime's request parent; do not create another parent in each handler.
- Avoid adding spans for trivial construction.
- Keep expected-error projection in the handler and unexpected-error handling with SvelteKit's hooks. Public wording and recovery follow the [frontend error-channel policy](frontend.md#error-channels-and-recovery).
- For HTTP Responses, annotate `http.response.status_code`. The summary's `success`, `failure`, or `cancelled` outcome describes Effect execution: returning a 503 Response is not an Effect failure. Cloudflare records the HTTP outcome.
- Successful operations and pure cancellation are logged at Info; failed operations are Error, including anonymous requests, denied access, and missing resources. Error means the operation failed, not necessarily that an incident requires intervention. Typed failures include both application rejections and operational outages; `error.kind` distinguishes typed failures, defects, and interruption independently of severity.
- Feature boundaries exhaustively project typed failures into public responses. SvelteKit's throwing projections run after the operation, outside Effect. Keep telemetry policy out of those projections and core errors.
- Preserve whole causes at the Promise boundary. In the installed Effect version, `Effect.result` can select a typed failure from a mixed cause, and `runPromise` squashes rejected causes to their first error. The request runner inspects the complete exit before conversion and uses `runPromiseExit` to preserve aggregate diagnostics.
- The server error hook skips fallback diagnostics only when the request is aborted and the retained cause contains interruptions alone. An aborted request never suppresses a mixed failure or an otherwise unknown error.
- Use stable error tags and failure categories in completion summaries. Keep driver-specific interpretation in the adapter that owns the integration; do not traverse arbitrary cause payloads in generic logging.
- Runtime initialization happens before the operation wrapper. An acquisition failure rejects without an operation-completion summary; it is not an expected failure returned by an already-built service.

Keep credentials redacted and select attributes deliberately. Standard Effect
diagnostics can include exception messages, stacks, causes, and SQL text. Never
expose these diagnostics through browser-facing errors.

## Maintaining telemetry

- `Observability.CollectorEndpoint` defines supported collector URLs beside exporter construction. `worker.ts` reads the optional configuration and declares the binding; malformed configuration is fatal during provisioning.
- Effect's default configuration provider treats empty strings as missing before validation.
- `stage` and SvelteKit `dev` describe the runtime environment. The runtime passes them to observability for resource metadata and console formatting; they are independent values.
- Use route templates, not concrete paths, in span names. Omit route groups from the display name and retain the original `sveltekit.route_id` as metadata.
- Parent names identify the request kind: `Request · GET /`, `Data · /org/[organizationSlug]/todos`, or `Remote · createTodo`. Classify remote requests before data requests using SvelteKit's flags. Remote queries may have no page route; remote forms may carry the calling page's route, retained only as metadata. Fall back to the method when no route or operation name is available; never substitute raw URLs or remote endpoint IDs.
- On remote HTTP requests, the first `locals.run(name, program)` call supplies the lazy parent name; a leading `Remote.` is omitted for display. Later operations, including refreshed queries, retain that parent. This is a first-application-operation label, not a framework-verified dispatch identity: helper work run first supplies the label. Remote calls during page/data rendering retain the route-based parent.
- Keep `app.request.kind` and `app.span.kind=request_scope` as metadata. The parent measures runtime-scope timing, from first use through cleanup, not HTTP latency or aggregate operation status. Child operation names identify the work performed. Cloudflare owns HTTP telemetry.
- Server spans describe server work, not every browser navigation. Reused layout data and retained query results can avoid server calls; hover preloading can perform work before the click. Do not force invalidation to produce telemetry.
- Trace memoized public operations outside the cache when caller visibility matters. Authentication's `app.auth.reused` includes completed and in-flight reuse.
- Preserve bounded, best-effort export during disposal; application operations should not await collector delivery.

| Setting                            | Purpose                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| SvelteKit `dev`                    | Native logfmt locally, JSON otherwise                                               |
| `DEPLOYMENT_ENVIRONMENT` → `stage` | Alchemy stage in OTLP resource metadata                                             |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | Optional collector base URL, validated during provisioning; enables logs and traces |

Use a trusted collector. Cloudflare and Effect traces are separate.

See the [README](../../../../README.md#local-telemetry) for local viewer commands.
