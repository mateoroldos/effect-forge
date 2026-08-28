import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { Effect, Layer } from "effect";
import { Database } from "../internal/database.ts";
import { migrationConfig } from "../migrations.ts";
import { WorkspaceStorePostgres } from "../workspace/workspace-store-postgres.ts";

const databaseLayer = Layer.effect(
  Database.Service,
  Effect.gen(function* () {
    const database = yield* makeWithDefaults();
    yield* migrate(database, migrationConfig);
    return database;
  }),
).pipe(Layer.provide(PgliteClient.layer()));

/** Provides every PostgreSQL persistence port through an isolated migrated PGlite database. */
export const layer = WorkspaceStorePostgres.layer.pipe(Layer.provide(databaseLayer));

export * as PersistencePglite from "./persistence-pglite.ts";
