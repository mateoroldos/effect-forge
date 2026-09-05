import * as authSchema from "../auth/schema.ts";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Effect } from "effect";
import { migrationConfig } from "../migrations.ts";

const makeDatabase = (client: PGlite) =>
  drizzle({ client, relations: { ...authSchema.authRelations } });

export interface PgliteDatabase {
  readonly client: PGlite;
  readonly database: ReturnType<typeof makeDatabase>;
}

/** Acquires an isolated database with the generated migration history applied. */
export const make = Effect.acquireRelease(
  Effect.gen(function* () {
    const client = new PGlite();
    const database = makeDatabase(client);
    yield* Effect.promise(() => migrate(database, migrationConfig));
    return { client, database };
  }),
  ({ client }) => Effect.promise(() => client.close()),
);

export * as PgliteDatabase from "./pglite-database.ts";
