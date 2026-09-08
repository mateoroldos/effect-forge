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

packages/contracts/src/agents-api.ts
  public HttpApi group, payloads, success values, public errors

apps/api/src/http/agents.ts
  public handlers and error projection
```

The web and public API are independent entrypoints to the same application service. A capability does not require an API contract unless an external client needs one.

## Sequence

1. Add the domain vocabulary and invariant tests.
2. Define the application service and the smallest port it needs.
3. Test application policy with substitute Layers.
4. Implement and test the production adapter.
5. Add a SvelteKit remote function for browser access.
6. Build the feature UI from the remote schema and result.
7. If external clients need the capability, add its public `HttpApi` contract and handler.
8. Add one integration test at each new framework boundary.
9. Run every repository validation command.

Stop when the slice is coherent. Do not add generalized policy, providers, transports, or UI state for anticipated features.

## Ownership

```text
domain schema and decisions
  → core application service and owned port
  ├─ SvelteKit remote boundary → browser UI
  └─ HttpApi boundary → external clients
```

Reuse domain schemas outward. Create a protocol-specific schema only when the public representation intentionally differs.

Remote handlers and API handlers own authentication extraction, input decoding, service invocation, and protocol error projection. They do not own application policy or persistence.
