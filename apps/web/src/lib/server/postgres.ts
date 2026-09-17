import { PersistencePostgres } from "@effect-forge/database-postgres";
import * as PgClient from "@effect/sql-pg/PgClient";
import { Context, Effect, Layer, Redacted, Schema } from "effect";
import { Client } from "pg";

export class AuthClient extends Context.Service<AuthClient, Client>()(
  "@effect-forge/web/Postgres/AuthClient",
) {}

class AuthConnectionError extends Schema.TaggedError<AuthConnectionError>()(
  "AuthConnectionError",
  {},
) {}

export const authenticationLayer = (connectionString: string) =>
  Layer.effect(
    AuthClient,
    Effect.acquireRelease(
      Effect.sync(() => {
        const client = new Client({
          connectionString,
          types: PersistencePostgres.typeParsers,
        });
        // pg emits socket errors independently of query promises. Never print driver payloads.
        client.on("error", () =>
          Effect.runSync(Effect.logError("Authentication PostgreSQL connection failed")),
        );
        return client;
      }),
      (client) => Effect.promise(() => client.end()).pipe(Effect.timeoutOption(1000)),
    ).pipe(
      Effect.tap((client) =>
        Effect.tryPromise({
          try: () => client.connect(),
          catch: () => new AuthConnectionError(),
        }).pipe(Effect.orDie),
      ),
    ),
  );

export const applicationLayer = (connectionString: string) =>
  PgClient.layerFrom(
    PgClient.makeClient({
      url: Redacted.make(connectionString),
      acquireForStream: false,
      types: PersistencePostgres.typeParsers,
    }),
  );

export * as Postgres from "./postgres.ts";
