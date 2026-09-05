import { Layer } from "effect";
import { type CustomTypesConfig, types } from "pg";
import { Database } from "./internal/database.ts";
import { WorkspaceStorePostgres } from "./workspace/workspace-store-postgres.ts";

const drizzleRawStringOids = new Set([1082, 1114, 1184, 1186, 1231, 1115, 1185, 1187, 1182]);

/** Preserves the PostgreSQL strings decoded by Drizzle's Effect codecs. */
export const typeParsers: CustomTypesConfig = {
  getTypeParser: (oid, format) =>
    drizzleRawStringOids.has(oid) ? (value: string) => value : types.getTypeParser(oid, format),
};

/** Provides every PostgreSQL-backed application persistence port. */
export const layer = WorkspaceStorePostgres.layer.pipe(Layer.provide(Database.layer));

export * as PersistencePostgres from "./persistence-postgres.ts";
