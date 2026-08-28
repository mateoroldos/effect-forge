<p align="center">
  <img src=".github/assets/logo-light.svg#gh-light-mode-only" alt="effect-forge" width="400">
  <img src=".github/assets/logo-dark.svg#gh-dark-mode-only" alt="effect-forge" width="400">
</p>

<p align="center">A TypeScript monorepo designed for <strong>human &lt;&gt; agent</strong> collaboration.</p>

<p align="center">
  <a href="https://effect-forge.com">Website</a>
  &nbsp;·&nbsp;
  <a href="https://mateoroldos.com/blog/notes-on-agentic-coding/">Notes on agentic coding</a>
  &nbsp;·&nbsp;
  <a href="LICENSE">MIT</a>
</p>

<p align="center"><code>bunx degit mateoroldos/effect-forge my-app</code></p>

## About

Agents write code faster than anyone can review it. `effect-forge` is a monorepo template shaped around that problem — types and traces that make behaviour inspectable, boundaries that keep changes small, and checks fast enough that an agent proves its own work before you read a line of it.

It is opinionated: Effect, Bun, PostgreSQL, and Cloudflare, wired together and deployed by Alchemy.

```text
AGENTS.md                conventions every agent reads
skills/effect-forge/     playbooks, loaded per task

apps/
├─ web                   TanStack Start application
├─ api                   Effect HTTP API
│  └─ src/infrastructure database and telemetry composition
└─ site                  the project's landing page

packages/
├─ domain                the domain model
├─ core                  application services and ports
├─ contracts             typed HTTP contracts
└─ ui                    shared visual vocabulary

adapters/
└─ database-postgres     PostgreSQL port implementations

alchemy.run.ts           infrastructure as code
```

## Development

Bootstrap a checkout and authenticate the local Alchemy profile:

```sh
mise trust
mise run setup
bun alchemy login --configure
```

Local API telemetry defaults to unauthenticated Maple OTLP at `http://localhost:4318`. To use hosted Maple, including from preview Workers, configure both values in the root `.env` or deployment environment:

```sh
MAPLE_ENDPOINT=https://ingest.maple.dev
MAPLE_INGEST_KEY=...
```

Preview Workers cannot reach a collector running on your machine.

Start the application:

```sh
bun run dev
```

`mise` derives `STAGE` from the user and checkout directory. Each clone, `git worktree`, or `jj workspace` therefore gets its own Neon branch and local Alchemy stage, branched from the staging project — so staging has to exist first.

## Validation

```sh
bun run test    # tests only
bun run check   # formatting, lint, types, and tests
bun run build   # production builds
```

CI runs `check` and `build`.

## Deployment

```text
internal PR with preview label
  → CI
  → EffectForge:pr-<number>
  → preview URL posted on the PR

label removed or PR closed
  → preview destroyed

merge to main
  → CI
  → EffectForge:prod
```

Pull requests without the `preview` label run validation only. Forks cannot access deployment credentials. Deployments to the same stage are queued because `Cloudflare.state()` does not lock concurrent writes.

[`docs/deployment.md`](docs/deployment.md) covers the stages and the one-time maintainer setup.
