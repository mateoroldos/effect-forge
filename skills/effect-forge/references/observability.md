# Observability

## Application operations

Use `locals.run(name, program)` in remote functions, layouts, and endpoints. It
creates a native span and one completion summary, records tagged errors, returns
a typed `Result`, and binds request cancellation. Defects, interruption, and runtime
initialization failures reject the Promise.

Project the `Result` into application values or SvelteKit errors; do not return it
directly to the browser:

```ts
const result = await event.locals.run(
  "Web.listWorkspaces",
  Effect.gen(function* () {
    const directory = yield* WorkspaceDirectory.Service;
    const workspaces = yield* directory.list(principal);
    yield* Effect.annotateCurrentSpan("workspace.count", workspaces.length);
    return workspaces;
  }),
);
if (Result.isFailure(result)) return error(500, "We couldn’t load your workspaces.");
return result.success;
```

- Add meaningful operation facts with `Effect.annotateCurrentSpan`; use named `Effect.fn` spans for internal work.
- Reuse the runtime's request parent; do not create another parent in each handler.
- Avoid adding spans for trivial construction.
- Keep expected-error projection in the handler and unexpected-error handling with SvelteKit's defaults.
- For HTTP Responses, annotate `http.response.status_code`. The summary's `success`, `failure`, or `cancelled` outcome describes Effect execution: returning a 503 Response is not an Effect failure. Cloudflare records the HTTP outcome.

Keep credentials redacted and select attributes deliberately. Standard Effect
diagnostics can include exception messages, stacks, causes, and SQL text. Never
expose these diagnostics through browser-facing errors.

## Maintaining telemetry

- Use route templates, not concrete paths, in span names. Omit route groups from the display name and retain the original `sveltekit.route_id` as metadata.
- Treat `Web.requestScope` as runtime-scope timing, from first use through cleanup, not HTTP latency or aggregate operation status. Cloudflare owns HTTP telemetry.
- Trace memoized public operations outside the cache when caller visibility matters. Authentication's `app.auth.reused` includes completed and in-flight reuse.
- Preserve bounded, best-effort export during disposal; application operations should not await collector delivery.

| Setting                            | Purpose                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| SvelteKit `dev`                    | Native logfmt locally, JSON otherwise                                               |
| `DEPLOYMENT_ENVIRONMENT` → `stage` | Alchemy stage in OTLP resource metadata                                             |
| `OTEL_EXPORTER_OTLP_ENDPOINT`      | Optional collector base URL, validated during provisioning; enables logs and traces |

Use a trusted collector. Cloudflare and Effect traces are separate.

See the [README](../../../README.md#local-telemetry) for local viewer commands.
