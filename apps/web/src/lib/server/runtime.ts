import { Application } from "@effect-forge/core/application";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { NodeCrypto } from "@effect/platform-node";
import * as PgClient from "@effect/sql-pg/PgClient";
import { drizzle } from "drizzle-orm/node-postgres";
import { Context, Effect, Layer, ManagedRuntime, Redacted } from "effect";
import { Pool } from "pg";
import type { WebWorkerEnv } from "../../../worker.ts";
import { Authentication } from "./authentication.ts";

class PostgresPool extends Context.Service<PostgresPool, Pool>()(
  "@effect-forge/web/PostgresPool",
) {}

const postgresPoolLayer = (connectionString: string) =>
  Layer.effect(
    PostgresPool,
    Effect.acquireRelease(
      Effect.sync(() => {
        const pool = new Pool({
          connectionString,
          max: 5,
          types: PersistencePostgres.typeParsers,
        });
        pool.on("error", () => {
          // oxlint-disable-next-line effecttsgo/global-console -- pg emits idle errors outside Effect operations; keep the diagnostic credential-safe.
          console.error("PostgreSQL pool reported an idle client error");
        });
        return pool;
      }),
      (pool) => Effect.promise(() => pool.end()),
    ),
  );

export interface Input {
  readonly baseURL: string;
  readonly database: WebWorkerEnv["DATABASE"];
  readonly request: Request;
  readonly secret: Redacted.Redacted<string>;
}

/** Builds all stable services owned by one SvelteKit request. */
export const make = ({ baseURL, database, request, secret }: Input) => {
  const pool = postgresPoolLayer(database.connectionString);
  const postgres = PgClient.layerFrom(
    Effect.gen(function* () {
      const pool = yield* PostgresPool;
      return yield* PgClient.fromPool({
        acquire: Effect.succeed(pool),
        types: PersistencePostgres.typeParsers,
      });
    }),
  );
  const persistence = PersistencePostgres.layer.pipe(Layer.provide(postgres));
  const application = Application.layer.pipe(
    Layer.provide(Layer.merge(NodeCrypto.layer, persistence)),
  );
  const authentication = Layer.unwrap(
    Effect.gen(function* () {
      const pool = yield* PostgresPool;
      const authDatabase = drizzle({
        client: pool,
        relations: { ...authSchema.authRelations },
      });
      return Authentication.layer({
        baseURL,
        database: authDatabase,
        request,
        secret,
      });
    }),
  );

  return ManagedRuntime.make(Layer.merge(application, authentication).pipe(Layer.provide(pool)));
};

export type Runtime = ReturnType<typeof make>;

export * as WebRuntime from "./runtime.ts";
