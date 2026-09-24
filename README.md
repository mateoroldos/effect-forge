<p align="center">
  <img src=".github/assets/logo-light.svg#gh-light-mode-only" alt="Effect Forge" width="400">
  <img src=".github/assets/logo-dark.svg#gh-dark-mode-only" alt="Effect Forge" width="400">
</p>

<p align="center">A TypeScript and Effect foundation for humans and agents.</p>

<p align="center">
  <a href="https://effect-forge.com">Website</a>
  &nbsp;·&nbsp;
  <a href="VISION.md">Vision</a>
  &nbsp;·&nbsp;
  <a href="LICENSE">MIT</a>
</p>

## Start a project

Give your coding agent the [starter prompt](docs/template/start-project.md) to shape your
product and choose [what to copy or change](docs/template/adapt-template.md).
To try the full template, follow the setup below.

## Run the example

The example is a SvelteKit app with accounts, organizations, and shared todos.
Running it needs Cloudflare and Neon access; deployment also needs a GitHub
repository and a domain in Cloudflare.

Install [Bun](https://bun.sh) and [mise](https://mise.jdx.dev/getting-started.html),
then copy the template. Setup installs the repository's pinned tools and dependencies.

```sh
bunx degit mateoroldos/effect-forge my-app
cd my-app
mise trust
mise run setup
```

Development uses Cloudflare and Neon resources through an Alchemy profile. For a
new project, complete [project setup](docs/project-setup.md), including
the first `staging` deployment. For an existing project, obtain the development
profile credentials and access to staging.

```sh
bun alchemy profile edit
bun run dev
```

Open the Web URL printed by Alchemy. Sign up, create an organization, and add a
todo; refresh to confirm it persists. If startup cannot find staging, check the
profile and that the [staging deployment](docs/project-setup.md#5-create-staging) succeeded.

## Check your changes

```sh
bun run check   # format, lint, types, tests, boundaries, schemas, migrations, dead code, guidance
bun run build   # production builds
```

CI runs both commands. See the guides for [database changes](adapters/database-postgres/README.md),
[local telemetry](apps/web/docs/observability.md#local-telemetry), and
[deployment](docs/deployment.md).

## Find your way around

- [Agent instructions](AGENTS.md) and [change workflow](.agents/skills/effect-forge/SKILL.md)
- [Architecture](.agents/skills/effect-forge/references/architecture.md)
- [Trace a todo](docs/trace-a-todo.md) through the code
