import { PgliteClient } from "@effect/sql-pglite";
import { makeWithDefaults } from "drizzle-orm/effect-pglite";
import { migrate } from "drizzle-orm/effect-pglite/migrator";
import { Effect, Layer } from "effect";
import { DatabasePostgres } from "../database-postgres.ts";
import { migrationConfig } from "../migrations.ts";

/** Provides an isolated migrated PGlite database for tests. */
export const layer = Layer.effect(
  DatabasePostgres.Service,
  Effect.gen(function* () {
    const database = yield* makeWithDefaults();
    yield* migrate(database, migrationConfig);
    return database;
  }),
).pipe(Layer.provide(PgliteClient.layer()));

export * as DatabasePglite from "./database-pglite.ts";
