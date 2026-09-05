# Feature workflow

Build one capability through its owned boundaries. Add only the layers the capability needs.

## Shape

```text
packages/domain/src/agent/
  Agent, AgentId, AgentName, pure decisions

packages/core/src/agent/
  AgentDirectory service, AgentStore port

adapters/database-postgres/src/agent/
  AgentStore PostgreSQL adapter

apps/web/src/lib/features/agents/
  remote functions, forms, presentation
```

Web is the current application entrypoint. A future public API is a peer entrypoint to the same application service, introduced only when an external client needs one.

## Sequence

1. Add the domain vocabulary and invariant tests.
2. Define the application service and the smallest port it needs.
3. Test application policy with substitute Layers.
4. Implement and test the production adapter.
5. Add a SvelteKit remote function for browser access.
6. Build the feature UI from the remote schema and result.
7. Add one integration test at each new framework boundary.
8. Run every repository validation command.

Stop when the slice is coherent. Do not add generalized policy, providers, transports, or UI state for anticipated features.

## Ownership

```text
domain schema and decisions
  → core application service and owned port
  └─ SvelteKit remote boundary → browser UI
```

Reuse domain schemas outward. Create a protocol-specific schema only when the public representation intentionally differs.

Remote handlers own authentication extraction, input decoding, service invocation, and protocol error projection. They do not own application policy or persistence. If a future external client requires an API, shape its contract and handler as a separate feature slice.
