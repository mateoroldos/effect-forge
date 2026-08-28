import type { EffectPgDatabase } from "drizzle-orm/effect-postgres";
import { makeWithDefaults } from "drizzle-orm/effect-postgres";
import { Context, Layer } from "effect";

/** The adapter's shared acquired Drizzle database. */
export class Service extends Context.Service<Service, EffectPgDatabase>()(
  "@effect-forge/database-postgres/internal/Database",
) {}

/** Provides Drizzle over an Effect PostgreSQL client. */
export const layer = Layer.effect(Service, makeWithDefaults());

export * as Database from "./database.ts";
