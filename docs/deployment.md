# Deployment

For the first deployment, complete [project setup](project-setup.md).
This page covers routine deployments and failures.

## Environments

| Stage     | Trigger                                    | Database                      |
| --------- | ------------------------------------------ | ----------------------------- |
| `prod`    | Successful CI on `main`                    | Separate production project   |
| `staging` | Manual **Deploy app** workflow             | Shared non-production project |
| `pr-*`    | Internal PR with `preview` label, after CI | Branch of staging             |
| `dev_*`   | `bun run dev` (local runtime)              | Branch of staging             |

- Unlabeled PRs only validate; forks receive no deployment credentials.
- Preview URLs appear on PRs. Closing a PR or removing its label destroys the
  preview; database branches also expire after seven days.
- Developer branches persist. Stage names use username + checkout basename;
  use distinct basenames for independent workspaces.
- Alchemy applies [migrations](../adapters/database-postgres/README.md) before Worker use.
  Hyperdrive uses direct origins in Cloudflare, pooled origins locally.
- GitHub jobs serialize per stage. Local deploys do not share those concurrency
  groups; never deploy to the same stage concurrently. Cloudflare state has no lock.

## Troubleshooting

| Failure               | Check                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------- |
| Staging missing       | Profile/account, then [staging workflow](project-setup.md#5-create-staging) result        |
| Provisioning          | First failing Alchemy resource, provider access, target stage                             |
| Migration             | SQL and database state; preserve applied history and fix the cause before retrying        |
| Application operation | [Spans and retained causes](../apps/web/docs/observability.md#investigating-an-operation) |

Verify deployed changes by signing in, saving a todo, and refreshing. Record stage,
revision, action, and result. Local checks do not prove connectivity, preview
cleanup, or remote trace delivery.
