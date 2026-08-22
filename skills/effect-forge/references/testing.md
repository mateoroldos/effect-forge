# Testing

Test through public interfaces. Each seam verifies the behavior it owns.

| Seam                | What it verifies                                                                 |
| ------------------- | -------------------------------------------------------------------------------- |
| Domain              | parsing, invariants, permission decisions                                        |
| Application service | policy and effect ordering                                                       |
| PostgreSQL adapter  | SQL, scoping, constraints, row decoding                                          |
| HTTP                | request decoding, middleware, public error projection                            |
| Web state           | form error mapping, invalidation, optimistic apply and rollback                  |
| End-to-end          | representative critical request flows without repeating every lower-level branch |

## Test doubles

Provide substitute Layers instead of mocking modules.

- Use an in-memory Layer for service tests when it preserves the port contract.
- Use PGlite for PostgreSQL adapter tests.
- Use Effect test clocks and deterministic services for time and randomness.
- Use a real test server for HTTP round-trips.
- Use a fresh `AtomRegistry` for each web-state test.
- Run a shared port contract suite against each adapter when several adapters exist. Keep adapter-specific behavior, such as SQL constraints and provider error translation, in adapter tests.

Choose test Layer provisioning by lifecycle and isolation:

- Use `Effect.provide(...)` for a one-off dependency or configuration local to one test.
- Use `layer(...)` when several tests intentionally share one scoped fixture and state cannot leak between them.
- Use `it.layer(...)` when a nested group needs additional dependencies or independently built scoped setup.

Provisioning inside a test does not itself guarantee isolation: check whether the Layer, its memoization, or its underlying resources are shared. Prefer isolation over removing repeated setup, and share only when fixture construction cost or resource lifecycle justifies it.

Do not use `vi.mock`, `jest.mock`, arbitrary sleeps, or assertions against private calls.

## Property tests

Use fast-check when one assertion should hold across a large input space. Good properties compare independent operations or check an output invariant, for example:

- `decode(encode(value)) === value`
- `normalize(normalize(value)) === normalize(value)`
- every legal transition preserves the entity invariant

Do not generate a value from a schema and only assert that the same schema decodes it; that tests the schema against itself.

In Effect tests, prefer `it.effect.prop`. Pass a Schema for valid domain inputs or use `FastCheck` from `effect/testing` for custom generation. Keep named examples and regression cases.

## Placement

Test an expected failure where its policy is owned. A service authorization failure belongs in the service test; its HTTP status mapping belongs in the handler test; its field presentation belongs in a form test only when the user can correct that field.

Test optimistic behavior at the Atom boundary: provisional value, success reconciliation, failure rollback, and overlapping mutations when supported. Do not repeat every service branch through HTTP and browser tests.

## Target validation commands

```bash
bun run check-types
bun run test
bun run test:integration
bun run check
bun run check-arch
bun run knip
```

Do not report these commands as available or passing until the root workspace implements them.
