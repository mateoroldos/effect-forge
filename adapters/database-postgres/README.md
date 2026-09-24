# PostgreSQL

This adapter implements core-owned persistence ports. Better Auth and application
tables share a migration history, while their request clients and transaction
lifetimes remain separate in the [web runtime](../../apps/web/docs/runtime.md).

## Schema and migration workflow

Run these commands from the repository root:

1. After changing [Better Auth options](../../apps/web/src/lib/server/better-auth-options.ts), run `bun run auth:schema:generate`. The [CLI configuration](../../apps/web/auth.config.ts) uses those same options. Review the generated [auth schema](src/auth/schema.ts).
2. After changing auth or application table definitions, run `bun run db:generate`.
3. Review the SQL and snapshots in [drizzle](drizzle). Commit them with the schema change. Add a migration rather than editing one already applied to a database.
4. Run `bun run auth:schema:check`, `bun run db:check`, and the affected adapter tests while iterating; finish with root validation.

Complete when the generated schema matches provider configuration, migration
history represents the intended table changes, and public-port tests verify the
new behavior against checked-in SQL. Review destructive changes and data movement
explicitly; a successful generator does not prove a migration preserves data.

`db:check` runs Drizzle generation against a disposable copy of migration history
to detect missing migrations. PGlite fixtures apply checked-in SQL. Alchemy applies
the migration directory during provisioning, before the Worker uses the database;
migrations do not run during Worker startup or requests.

## Follow an existing adapter

- [TodoStorePostgres](src/todo/todo-store-postgres.ts): organization-scoped SQL, row decoding, and translation into port errors.
- [Todo adapter tests](src/todo/todo-store-postgres.test.ts): observable persistence and isolation behavior.
- [Migrated PGlite resource](src/test/pglite-database.ts): physical schema shared through the explicit test-only export, including provider-handler tests in web.
- [Persistence test Layer](src/test/persistence-pglite.ts): application persistence on the migrated resource.

PGlite verifies SQL behavior locally. It does not establish Neon provisioning,
Hyperdrive connectivity, or Cloudflare socket lifecycle behavior. Use
[deployment guidance](../../docs/deployment.md) for those changes.
