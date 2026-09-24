# Frontend

For UI changes. Protected operations also follow [authentication rules](authentication.md).

## State and forms

- Use `query` for reads/caching, `form` for mutations, and runes for presentation.
  Use `command` only when a form cannot work. Add no separate state/query library.
- Keep remote functions with the feature. Validate with Effect Schema through
  Standard Schema, resolve identity, call core through `locals.run`, then map the result.
- Use form fields, issues, and `pending`, not mirrored local state. Follow
  [UI field rules](../../../packages/ui/AGENTS.md); general errors belong at form level.
- Capture intended values before `submission.submit().updates(query.withOverride(...))`.
  Never toggle inside an override. Refresh after success; concurrent writes still
  need ordering care. Follow [todo creation](../../../docs/trace-a-todo.md#optimistic-presentation)
  for unsaved rows and restoring text without overwriting newer input.

## Error channels and recovery

`AuthGuard` maps auth failures; remote functions map feature failures exhaustively
with `Match.valueTags`; components handle recovery. Throw Kit errors/redirects after
Effect execution. Keep credentials and provider causes out of public responses.

| Outcome                                   | Recovery                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------ |
| Invalid input                             | Inline issues; preserve input                                                        |
| Missing identity                          | Sign-in redirect; validate same-origin return path                                   |
| Denied access                             | Safe `403`; leave unauthorized context                                               |
| Missing resource                          | Safe `404`; roll back, notify, refresh                                               |
| Dependency rejects before mutation starts | Safe `503`; preserve input; deliberate retry is safe                                 |
| Unknown mutation outcome                  | Safe `500` or uncertainty message; roll back presentation and reconcile before retry |
| Query/render/navigation failure           | Route error boundary with reload or exit                                             |

Never automatically retry an uncertain write: a lost response may hide a commit.
After confirmed creation, retry navigation/refresh, not creation.
Status and `isHttpError` prove neither message
safety nor whether a write happened.

Keep recoverable mutation errors local. Let Kit handle redirects and denied access.
Report caught unknown errors—they no longer reach `handleError`. Use `finally` for
cleanup; failed reconciliation may reach the route boundary. Native submissions
need safe messages too.

## Environment

| Value                               | Declare                                                         | Read                 |
| ----------------------------------- | --------------------------------------------------------------- | -------------------- |
| Public scalar                       | Worker `env` + `defineEnvVars` in `src/env.ts` (`public: true`) | `$app/env/public`    |
| Runtime scalar, secret, or resource | Worker `env`                                                    | `event.platform.env` |
| Deployment input                    | Shell/CI                                                        | Effect `Config`      |
| Build metadata                      | Vite                                                            | `import.meta.env`    |

Keep secrets out of build placeholders. Return needed data, never native bindings.

## Loading

- Await identity/slug context in layouts; keep list queries in components.
- Await SSR-required data without a pending snippet. For deferred data, await
  inside `<svelte:boundary pending={loading}>`; keep independent UI outside.
- Key organization boundaries by ID. Preserve content during refresh. Use the
  route error boundary unless local recovery is needed.
- Use `app.html` hover preloading for code/layout data. Component queries start
  on navigation; add no manual hover fetches or cache-warming loads.

**Provisional workaround:** `experimental.forkPreloads` stays disabled after a
reported cold-hover crash on Kit `3.0.0-next.25` / Svelte `5.57.0`; no reproduction
is linked. On upgrade, enable it and test loading in a fresh browser. Capture
errors/requests; remove the restriction if the cases below pass.

## Verification

Browser checks are manual; use an isolated development stage:

- **Forms:** valid/invalid/native submissions, pending state, refresh, rollback,
  restoration, and newer input preserved. Lose a response; reconcile before retry.
- **Loading:** SSR/hydration, hover/early click/abandon, organization switching,
  query failures, retained content, and duplicate requests.
- **Access:** use the [authentication cases](authentication.md#verify).

Test public behavior without production fault switches. Add regression tests where
needed; report browser/provider gaps separately from automated results.
