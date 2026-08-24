import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { migrate } from "drizzle-orm/effect-postgres/migrator";
import { Context, Effect, Layer, Schema } from "effect";
import { migrationConfig } from "./migrations.ts";

/** An acquired Drizzle PostgreSQL database. */
export class Service extends Context.Service<Service, EffectPgDatabase>()(
  "@effect-forge/database/DatabasePostgres",
) {}

/** Provides Drizzle over an Effect PostgreSQL client. */
export const layer = Layer.effect(Service, makeWithDefaults());

/** Applies pending production migrations. */
export const runMigrations = Effect.gen(function* () {
  const database = yield* Service;
  yield* migrate(database, migrationConfig).pipe(
    Effect.mapError((cause) => new MigrationError({ cause })),
  );
});

/** Indicates that PostgreSQL migrations could not be applied. */
export class MigrationError extends Schema.TaggedError<MigrationError>()(
  "DatabasePostgres.MigrationError",
  { cause: Schema.Defect() },
) {}

export * as DatabasePostgres from "./database-postgres.ts";
