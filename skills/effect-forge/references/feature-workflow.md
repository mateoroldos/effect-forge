# Feature workflow

Use one capability path from domain to UI. The Agent example defines the expected ownership and file sequence.

## Shape

```text
packages/domain/src/agent/
  Agent, AgentId, AgentName

packages/core/src/agent-directory/
  AgentDirectory service
  AgentStore port

adapters/database-postgres/src/agent-store-postgres/
  AgentStore PostgreSQL adapter

packages/contracts/src/agents-api/
  HttpApi group, payloads, success values, public errors

apps/api/src/http/agents.ts
  handlers and application-to-HTTP error projection

apps/web/src/lib/api/app-api-client.ts
  AtomHttpApi client

apps/web/src/features/agents/
  query atoms, create form, optimistic list, presentation

apps/web/src/routes/agents.tsx
  route metadata, loader, and feature composition
```

## Sequence

1. Add domain schemas and invariant tests.
2. Define the application service contract, its expected errors, and the port it requires.
3. Write service policy tests with a substitute port Layer.
4. Implement the PostgreSQL adapter and verify it with PGlite.
5. Add the operation to the public `HttpApi` contract using domain schemas.
6. Implement the API handler and compose its Layers in `apps/api`.
7. Add the operation to the shared `AtomHttpApi` client.
8. Build the TanStack Form from the contract input schema.
9. Add an optimistic mutation only when immediate feedback improves the interaction; verify success reconciliation and failure rollback.
10. Compose the feature from a thin TanStack route.
11. Add one HTTP round-trip and one representative browser flow.
12. Run every repository validation command.

## Contract ownership

```text
domain schemas
  → application service inputs and outputs
  → HttpApi payload and success schemas
  → AtomHttpApi client
  → TanStack Form validation
```

Reuse schemas outward. Create a wire-specific schema only when the public representation intentionally differs. Decode form values again on submission because Standard Schema validation preserves the input type rather than transformed output.

Handlers own authentication extraction, transport decoding, service invocation, and HTTP error projection. They do not own application policy or persistence.
