# Effect Forge

Read [VISION.md](VISION.md) for the project's purpose and priorities.
Read the `AGENTS.md` files in the areas you change.

- For code changes, use the [Effect Forge workflow](.agents/skills/effect-forge/SKILL.md).
- For dependencies, ownership, or composition, read [architecture](.agents/skills/effect-forge/references/architecture.md).
- Before creating, editing, moving, or deleting documentation, instructions, or skill files—even during a code task—read [guidance maintenance](.agents/skills/effect-forge/references/documentation.md).

Before writing Effect code, read `node_modules/effect/AGENTS.md` completely.
Use installed sources to establish API behavior and repository guidance to establish
application policy. Report conflicts between them.

## Validation

Test through public interfaces with substitute dependencies. Do not mock modules
or use arbitrary sleeps. Use focused checks while working; finish with
`bun run check` and `bun run build`.

Correct guidance when a change makes it inaccurate. Code changes alone do not
require documentation changes. Report commands run, results, and behavior not
verified. A blocked check is a gap, not a passing result.
