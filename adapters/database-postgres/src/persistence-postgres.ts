import { Layer } from "effect";
import { IdentityStorePostgres } from "./identity/identity-store-postgres.ts";
import { Database } from "./internal/database.ts";
import { WorkspaceStorePostgres } from "./workspace/workspace-store-postgres.ts";

/** Provides every PostgreSQL-backed application persistence port. */
export const layer = Layer.mergeAll(IdentityStorePostgres.layer, WorkspaceStorePostgres.layer).pipe(
  Layer.provide(Database.layer),
);

export * as PersistencePostgres from "./persistence-postgres.ts";
