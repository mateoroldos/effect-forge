# Effect Forge

**An AI-first Effect monorepo for production TypeScript applications.**

Effect Forge pairs a TanStack Start web app with a separate Effect API. React and Effect Atom power the client, TanStack Form handles forms, PostgreSQL stores application data, Better Auth provides identity, and Alchemy deploys both applications.

The repository is designed for humans and coding agents to change safely: architecture rules are enforced, module shapes are predictable, project knowledge lives beside the code, and deterministic checks verify each change.

```text
apps/
├─ web/          TanStack Start application
└─ api/          Effect HTTP API

packages/
├─ domain/       shared domain values and schemas
├─ core/         application services and ports
├─ contracts/    public HttpApi contracts
├─ database/     PostgreSQL adapters
└─ auth-better/  Better Auth adapters
```

Effect Forge is currently a design seed. The application scaffold has not been implemented.
