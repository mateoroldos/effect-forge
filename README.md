# Effect Forge

**An AI-first Effect monorepo for production TypeScript applications.**

Effect Forge pairs a TanStack Start web app with a separate Effect API. React and Effect Atom power the client, TanStack Form handles forms, PostgreSQL stores application data, Better Auth provides identity, and Alchemy owns development and deployment.

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

## Environments

| Stage     | Started by                       | Database                                 | Runtime    |
| --------- | -------------------------------- | ---------------------------------------- | ---------- |
| `prod`    | successful CI on `main`          | protected production project and branch  | Cloudflare |
| `staging` | manual **Deploy app** workflow   | shared non-production project and branch | Cloudflare |
| `pr-*`    | internal PR with `preview` label | isolated branch of the staging project   | Cloudflare |
| `dev_*`   | `bun run dev`                    | isolated branch of the staging project   | local      |

Production never shares a Neon project with non-production stages. Preview database branches expire after seven days as a fallback; the cleanup workflow normally removes the whole preview when the PR closes or loses its `preview` label.

## Project setup

A maintainer completes this once before enabling deployment.

### 1. Create the Cloudflare bootstrap token

Use Alchemy's token helper instead of assembling policies in the dashboard:

```sh
bun alchemy cloudflare create-token --name effect-forge-admin
```

Alchemy asks for the Global API Key once, resolves the account's current permission groups, creates the token, and verifies it. The Global API Key is not stored. Select this account and grant:

- Account API Tokens Write
- Workers Scripts Write
- Workers KV Storage Write
- Workers Routes Write
- Workers Observability Write
- Workers Tail Read
- Hyperdrive Write
- Secrets Store Write
- Account Settings Write

`Account API Tokens Write` lets the credential stack create `CIToken`; the remaining permissions are the maximum capabilities it may delegate and let the profile access remote state. Do not select `--all-permissions`.

### 2. Configure the admin profile

```sh
bun alchemy login stacks/github.ts --profile admin --configure
```

Choose:

- **Cloudflare:** `API Token`, then paste the bootstrap token.
- **GitHub:** `gh-cli` when available.

Alchemy stores both credentials under the local `admin` profile. This profile is privileged; use it only with `stacks/github.ts`. Normal development uses the default profile.

Neon profiles can store an API key for local deployments, but Alchemy does not expose that stored value to a stack that must copy it into GitHub. Create an ignored `.env` for this one pass-through secret:

```dotenv
NEON_API_KEY=...
```

### 3. Provision CI credentials

```sh
bun alchemy deploy stacks/github.ts --profile admin --env-file .env
```

The stack mints an account-owned, narrowly scoped Cloudflare token and writes it, the account ID, and the stored Neon key directly to GitHub Actions secrets. The generated CI token does not pass through the terminal. Re-run the stack after changing its permissions or the Neon key; replace `CIToken` in `stacks/github.ts` when intentional token rotation is required.

### 4. Enable previews

Before the first push, create the opt-in label:

```sh
gh label create preview --description "Deploy an isolated preview" --color 0e8a16
```

### 5. Create staging

After the workflows are merged to `main`, create the shared staging project:

```sh
gh workflow run deploy-app.yml --ref main -f stage=staging
```

Wait for that workflow to succeed before labeling a pull request or starting local development; both reference the staging Neon project.

## Development

Bootstrap a checkout and authenticate the local Alchemy profile:

```sh
mise trust
mise run setup
bun alchemy login --configure
```

Start the application:

```sh
bun run dev
```

`mise` derives `STAGE` from the user and checkout directory. Each clone, `git worktree`, or `jj workspace` therefore gets its own Neon branch and local Alchemy stage.

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
