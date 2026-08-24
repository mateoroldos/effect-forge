import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Layer } from "effect";

/** An acquired Drizzle PostgreSQL database. */
export class Service extends Context.Service<Service, EffectPgDatabase>()(
  "@effect-forge/database/DatabasePostgres",
) {}

/** Provides Drizzle over an Effect PostgreSQL client. */
export const layer = Layer.effect(Service, makeWithDefaults());

export * as DatabasePostgres from "./database-postgres.ts";
