# Set up a new project

One-time setup for the full cloud stack. Run commands from the repository root.
For an existing project, see [deployment operations](deployment.md).

You need installed dependencies, a GitHub repo with Actions enabled, Cloudflare
access with a domain, and a Neon API key. Set Git `origin` to your repo and run
`gh auth login` with access to manage its secrets.

## 1. Set project targets

Do this before the first push: successful CI on `main` deploys production and the site.

| File                                    | Change                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| [stacks/github.ts](../stacks/github.ts) | `owner` and `repository` for CI secrets                                               |
| [alchemy.run.ts](../alchemy.run.ts)     | Same owner/repository for preview comments                                            |
| [infra/stage.ts](../infra/stage.ts)     | `rootDomain` and affected test expectations                                           |
| [alchemy.site.ts](../alchemy.site.ts)   | Site zone/domain/redirects; [remove the site](template/adapt-template.md) if unwanted |
| [mise.toml](../mise.toml)               | Development profile name                                                              |

Review stack/resource names now; later renames can change resource identity.

## 2. Create the bootstrap token

```sh
bun alchemy provider cloudflare token --name my-app-admin
```

The helper uses your Global API Key to create and verify a token. Select your
account, `Account API Tokens Write`, and the account/zone permission groups in
the [`CIToken` policies](../stacks/github.ts). Do not select `--all-permissions`.

## 3. Configure the admin profile

```sh
bun alchemy profile edit --config stacks/github.ts --profile admin
```

Choose **Cloudflare → API Token** with the bootstrap token and **GitHub → gh-cli**.
Use this privileged profile only with the credential stack, not development.
The stack reads Neon from configuration; put the key in an ignored root `.env`:

```dotenv
NEON_API_KEY=...
```

## 4. Provision CI credentials

```sh
bun alchemy deploy stacks/github.ts --profile admin --env-file .env
```

Verify your repo has `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and
`NEON_API_KEY` Actions secrets. Re-run after permission or Neon key changes;
replace `CIToken` in the stack for intentional CI token rotation.

## 5. Create staging

Create the label, then push the configured project and workflows to `main`:

```sh
gh label create preview --description "Deploy an isolated preview" --color 0e8a16
```

Once workflows are available, run:

```sh
gh workflow run deploy-app.yml --ref main -f stage=staging
```

Wait for success. Configure Cloudflare/Neon development access with
`bun alchemy profile edit` using the profile in `mise.toml`. Follow the
[README](../README.md#run-the-example) to run the app and save a todo that survives a refresh.
