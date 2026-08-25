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

## Development

Bootstrap a fresh checkout and configure local infrastructure credentials:

```sh
mise trust
mise run setup
bun alchemy login --configure
```

A maintainer provisions the shared staging project once:

```sh
bun run deploy:staging
```

After staging exists, each developer starts an isolated Neon branch and local Worker directly through Bun:

```sh
bun run dev
```

`mise` derives `STAGE` from the checkout directory, so every clone, `git worktree`, or `jj workspace` deploys to its own stage and gets its own Neon branch and Worker. Two agents can work in parallel without sharing state. `deploy:staging` and `deploy:prod` pass an explicit stage and are unaffected.
