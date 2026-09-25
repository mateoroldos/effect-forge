# Maintain skills

Area instructions select the skills they use. Keep project policy outside managed
upstream bundles. `skills-lock.json` records their sources, revisions, and content hashes;
commit it with the installed directories and [license notices](THIRD_PARTY_NOTICES).
A checkout needs no skill download.

## Install or refresh

Run the pinned CLI from the repository root:

```sh
bun run skills list
bun run skills add <commit-pinned-tree-url> --skill <name> --agent universal
bun run skills remove <name> --agent universal
```

Use a full commit SHA in the GitHub tree URL. To upgrade, review the new revision
and repeat `add` with that URL. `update --project <name>` retains the recorded ref;
it does not advance a commit pin. In this CLI, `check` is an alias of `update` and
can write files; do not use it as a read-only CI check.

Before adding a skill, inspect its instructions, references, license, version/tool
requirements, and conflicts with the owning area's policy. Install only selected
skills into `.agents/skills/`. Harnesses reach that directory through committed
symlinks—`.claude/skills` serves Claude Code—so installing a skill needs no
harness change; add a link only for another harness in use.

After a change, review the bundle and lock diff, update the owner's reading link,
and run root validation plus one relevant fresh-agent task. Keep upstream files
unmodified; `.oxfmtrc.jsonc` excludes every installed bundle from formatting, so a new
skill needs no formatter edit. Local link checks apply only to first-party guidance;
`check:guidance` still validates every skill's required YAML metadata and checks that
locked skills are present.

When removing a boundary, remove skills with no remaining consumers and their reading
links. Adapt the project-owned skill rather than deleting the engineering workflow
during template adoption.
