# Observability

## Local telemetry

With Docker and the [development app configured](../../../README.md#run-the-example),
run from the repository root:

```sh
docker run --rm -p 127.0.0.1:8000:8000 -p 127.0.0.1:4318:4318 \
  ghcr.io/ctrlspice/otel-desktop-viewer:v0.5.0 --host 0.0.0.0 --open-browser=false
```

In another terminal, run `bun run dev:otel`. Perform an action in the app, then
find its span and completion log under `effect-forge.web` at <http://localhost:8000>.
Normal `bun run dev` needs no collector.

## Investigating an operation

1. Reproduce the action. Find its operation span and child service spans.
2. Compare the HTTP response with the Effect outcome; a returned `503` can be an Effect success.
3. Follow the error tag and cause to the owning service or adapter. If no summary exists, check whether a request occurred, then check runtime acquisition and hook errors.
4. Verify the fix through that owner's tests, then repeat the action. Report missing browser or provider evidence.

## Application operations

Use `locals.run(name, program)`; follow [listTodos](../src/lib/features/todos/todos.remote.ts).
Name operations `Remote.<export>`, `Load.<purpose>`, or `Endpoint.<purpose>`.
Add useful attributes, reuse the request parent, and map results to safe responses
after execution. Keep credentials and diagnostic causes out of public responses.

The request parent measures runtime lifetime, not HTTP latency. Cached browser data
may produce no server span. Do not force refreshes just to produce telemetry.

For changes, read the [runtime contract](runtime.md),
[exporter and summary code](../src/lib/server/observability.ts), and
[tests](../src/lib/server/observability.test.ts). Keep export bounded and best-effort;
verify collector delivery separately. Cloudflare and Effect traces are separate.
