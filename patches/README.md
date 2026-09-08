# Dependency patches

These patches are temporary, version-specific corrections to published dependencies. Bun applies them through `patchedDependencies` in the root `package.json`.

## Alchemy SvelteKit Hyperdrive development support

Alchemy `2.0.0-beta.76` resolves local Hyperdrive origins into its Worker development context, but the SvelteKit source provider does not forward them to the Cloudflare platform proxy. The platform proxy also omits Hyperdrive origins when it starts its internal Worker runtime. As a result, accessing a SvelteKit route that uses a Hyperdrive binding fails locally with `No hyperdrive origin was provided`.

The two patches form one fix:

- `@alchemy.run%2Ffrontend-frameworks@2.0.0-beta.76.patch` carries the origin map from the SvelteKit source provider through its development adapter to `getPlatformProxy`.
- `@alchemy.run%2Fcloudflare-runtime@2.0.0-beta.76.patch` adds that map to the platform proxy options and forwards it to `Runtime.start`.

This matches Alchemy's existing Vite, Astro, Waku, and Next.js development paths. It does not change production Hyperdrive configuration or application database composition.

Keep both patches until an Alchemy release includes both forwarding changes. When upgrading Alchemy, verify a fresh `bun install --frozen-lockfile`, start `bun run dev`, and request a SvelteKit route that uses `event.platform.env.DATABASE` before removing them.
