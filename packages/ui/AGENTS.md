# Shared UI

This package owns feature-independent Svelte components and the shared visual
vocabulary. Application permissions, remote functions, authentication, and feature
state belong to consumers.

- Follow neighboring components and the public subpath exports in `package.json`.
- Reuse `src/theme.css` tokens and existing component variants before adding a new visual convention.
- Preserve accessible labels, keyboard interaction, focus behavior, and disabled states when changing a primitive. Follow installed Bits UI behavior rather than reimplementing it.
- Fields own presentation, not validation or form state. Consumers connect explicit control IDs, labels, and error descriptions.
- Inspect changes from component generators before accepting them; root `bump-ui` overwrites the shared component collection and is not a targeted edit command.

The component project root is `packages/ui`: use this package's `components.json`, exports, and `@effect-forge/ui`
aliases. Run component CLI commands here, or with `-c packages/ui` from the root.
Verify installed Bits UI/component APIs; generic examples do not override local
ownership, form policy, or intentional component customizations.

Run the package's type check and relevant tests while iterating. Verify changed
interactions in a real consuming page, including keyboard and focus behavior.
Report browser checks separately from automated results.
