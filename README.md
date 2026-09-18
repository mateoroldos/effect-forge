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
├─ web                   SvelteKit and Better Auth composition
└─ site                  the project's landing page

packages/
├─ domain                the domain model
├─ core                  application services and ports
└─ ui                    shared visual vocabulary

adapters/
└─ database-postgres     PostgreSQL port implementations

infra/                   shared deployment resources and stage policy
alchemy.run.ts           application Stack summary
```

SvelteKit remote functions call application services directly. The Web Worker hosts Better Auth behind same-origin routes and projects authenticated principals into application operations. Independent API and CLI clients are added only when their concrete contracts and credentials are known.

## Development

Bootstrap a checkout and authenticate the local Alchemy profile:

```sh
mise trust
mise run setup
bun alchemy profile edit
```

```sh
bun run dev
```

`mise` derives `ALCHEMY_STAGE` from the user and checkout directory. Each clone, `git worktree`, or `jj workspace` therefore gets its own Neon branch and local Alchemy stage, branched from the staging project — so staging has to exist first.

### Local telemetry

Start the viewer in one terminal:

```sh
docker run --rm -p 127.0.0.1:8000:8000 -p 127.0.0.1:4318:4318 \
  ghcr.io/ctrlspice/otel-desktop-viewer:v0.5.0 --host 0.0.0.0 --open-browser=false
```

Then run the app in another:

```sh
bun run dev:otel
```

Open <http://localhost:8000>, service `effect-forge.web`. Development uses native
single-line logfmt; production uses JSON. Normal `bun run dev` needs no collector.

See [operation logging](skills/effect-forge/references/observability.md) for examples.

## Validation

```sh
bun run test    # colocated tests
bun run check   # formatting, lint, types, and tests
bun run build   # production builds
```

CI runs `check` and `build`. Colocated tests cover domain and application behavior,
provider HTTP handling, and SQL through PGlite.

### Database changes

After changing Better Auth options, run `bun run auth:schema:generate`. After changing
either authentication or application table definitions, run `bun run db:generate`.
Review and commit the generated SQL and snapshots with the schema change. Add new
migrations instead of editing migrations already applied to a database.

`bun run db:check` uses the existing Drizzle configuration and a disposable copy of
the migration history to detect missing migrations. It runs as part of `check`;
PGlite tests apply the checked-in SQL. Alchemy applies that migration directory to
Neon during provisioning, before the Worker uses the database.

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
