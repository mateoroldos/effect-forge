# Web

SvelteKit owns routes, rendering, and browser-to-server calls. Remote functions
invoke core directly. Add a public transport only when an independent client has
concrete operations and credential needs.

Better Auth owns users, sessions, organizations, memberships, and its browser
protocol. Its Svelte client calls same-origin `/api/auth/*` routes. Application
permissions remain in core; do not add another membership authority.

Read by task:

- Forms, environment, or loading: [frontend](docs/frontend.md).
- Protected operations or organization routes: [authentication](docs/authentication.md).
- Request composition, cancellation, or cleanup: [runtime](docs/runtime.md).
- Instrumentation or debugging: [observability](docs/observability.md).

For Svelte components/modules, load [Svelte core practices](../../.agents/skills/svelte-core-bestpractices/SKILL.md).
For shared component usage, follow [UI guidance](../../packages/ui/AGENTS.md).
Verify prerelease Kit APIs against installed sources/types; upstream skills do not
establish compatibility. This app owns remote-function and recovery policy.
