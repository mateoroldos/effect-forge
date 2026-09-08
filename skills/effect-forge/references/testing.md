# Testing

Test through public interfaces. Each seam verifies only the behavior it owns.

| Seam                | What it verifies                                             |
| ------------------- | ------------------------------------------------------------ |
| Domain              | parsing, invariants, authorization, entitlement decisions    |
| Application service | policy, authorization, effect ordering                       |
| PostgreSQL adapter  | SQL, scoping, constraints, row decoding                      |
| Provider adapter    | provider translation and error projection                    |
| Public HTTP API     | decoding, authentication, and public error projection        |
| SvelteKit           | remote validation, redirects, forms, and safe failure output |
| End-to-end          | representative critical flows                                |

## Test doubles

Provide substitute Layers instead of mocking modules.

- Use an in-memory Layer for service tests when it preserves the port contract.
- Use PGlite for PostgreSQL adapter tests.
- Use Effect test clocks and deterministic services for time and randomness.
- Exercise HTTP capabilities through the production router as Fetch-compatible `Request → Response` handlers.
- Exercise remote functions and endpoints through built SvelteKit server boundaries.
- Run a shared port contract suite against each adapter when several implementations exist.

Choose Layer provisioning by lifecycle and isolation:

- `Effect.provide(...)` for one dependency local to one test.
- `layer(...)` for tests that intentionally share one scoped fixture without mutable state leakage.
- `it.layer(...)` for a nested scenario with independently built scoped setup.

Keep setup in the narrowest useful scope. Add a helper only when it hides meaningful repeated mechanics. Do not alias one library call.

Do not use module mocks, arbitrary sleeps, or assertions against private calls.

## Authorization

Test each authorization rule once where it is owned:

- Pure role-to-permission decisions in domain tests.
- Membership resolution and enforcement in core service tests.
- Better Auth role translation in adapter tests.
- HTTP or SvelteKit status and message projection at the framework boundary.

Browser permission checks are presentation behavior; they do not replace a server authorization test.

## Property tests

Use fast-check when one assertion should hold across a large input space. Good properties compare independent operations or check an output invariant:

- `decode(encode(value)) === value`
- `normalize(normalize(value)) === normalize(value)`
- every legal transition preserves the entity invariant

Do not generate a value from a schema and only assert that the same schema decodes it.

In Effect tests, prefer `it.effect.prop`. Pass a Schema for valid domain inputs or use `FastCheck` from `effect/testing` for custom generation. Keep named examples and regression cases.

## Placement

Test an expected failure where its policy is owned. A service authorization failure belongs in the service test; its HTTP status belongs in the handler test; its field presentation belongs in a form test only when the field can correct it.

A public API test and a SvelteKit test may cover the same capability boundary without repeating every core policy branch.

## Validation

```bash
bun run check-types
bun run test
bun run test:integration
bun run check
bun run check-arch
bun run knip
```

Do not report a command as available or passing until the root workspace implements it.
