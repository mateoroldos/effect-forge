# Adapt the template

After the product interview, agree on the choices below before editing.
For pattern-only reuse, take just the pattern and its dependencies.

## Copy, edit, or remove

- **Always copy:** strict TypeScript, lint/format tooling, testing patterns, shared
  agent workflow, and `LICENSE`. Start from `tsconfig.base.json`, `.oxlintrc.json`,
  `.oxfmtrc.jsonc`, `tools/oxlint/`, and `.agents/skills/effect-forge/`.
- **Copy + edit:** vision, README, instructions, skill references, manifests,
  scripts, CI, `mise.toml`, Turbo, Knip, and TypeScript paths. Keep relevant checks;
  regenerate `bun.lock` after dependency changes.
- **Optional:** web, UI, site, auth, organizations, todos, database, cloud deployment.
  Keep only what the product needs.
- **Remove:** unchosen integrations, unused dependencies/docs, and template branding.
  Replace example evals with product tasks. Never copy credentials, `.env`, `.alchemy`,
  caches, `node_modules`, or Git/Jujutsu history.

## Check connected files

- **Workspaces:** update [workspace rules](../../tools/architecture/workspaces.ts), including
  the package scope, manifests, and fixtures.
- **Web/UI:** update CI setup (it runs web preparation), scripts, and Knip/TypeScript entries.
  A CLI needs its own entrypoint and service composition; core is not an executable.
- **Site:** edit `apps/site/src/site.ts` URLs/branding if kept; otherwise remove its
  Alchemy entrypoint, deploy workflow, `dev:site`, and tooling entries together.
- **Auth/todos/database:** trace core services, `Application.layer`, routes, adapters,
  fixtures, and migrations. Preserve applied migration history in existing databases.
- **Cloud:** update or remove Alchemy stacks, infrastructure, deploy/cleanup workflows,
  and provider-specific checks. Review [dependency patches](../../patches/README.md)
  when dropping SvelteKit/Hyperdrive.

Search for removed names and paths. For the full cloud stack, set repository
targets and domains through [project setup](../project-setup.md).

## Finish adoption

Keep and rename the shared engineering skill for the product; update its metadata
and incoming links. Keep area docs only with their consumers. Rewrite setup
and deployment guides for retained infrastructure. Replace example walkthroughs
and evaluation tasks with product examples.

Once product instructions and setup are ready, remove `docs/template/`, including
this guide. Update README/vision links and remove or replace the site's starter-prompt
import, copy buttons, and Turbo input together.

## Done

Guidance describes the new product, `bun run check` and `bun run build` pass,
and the first feature works through its public entrypoint. Report any browser or
provider behavior not verified. Fix stale checks rather than disabling them.
