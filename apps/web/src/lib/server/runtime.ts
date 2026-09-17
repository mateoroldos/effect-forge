import { Application } from "@effect-forge/core/application";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { NodeCrypto } from "@effect/platform-node";
import * as PgClient from "@effect/sql-pg/PgClient";
import { drizzle } from "drizzle-orm/node-postgres";
import { Context, Effect, Layer, ManagedRuntime, Redacted, Schema } from "effect";
import { Client } from "pg";
import type { WebWorkerEnv } from "../../../worker.ts";
import { Authentication } from "./authentication.ts";

class AuthenticationPostgresClient extends Context.Service<AuthenticationPostgresClient, Client>()(
  "@effect-forge/web/AuthenticationPostgresClient",
) {}

class AuthenticationPostgresConnectionError extends Schema.TaggedError<AuthenticationPostgresConnectionError>()(
  "AuthenticationPostgresConnectionError",
  {},
) {}

const authenticationPostgresClientLayer = (connectionString: string) =>
  Layer.effect(
    AuthenticationPostgresClient,
    Effect.acquireRelease(
      Effect.sync(
        () =>
          new Client({
            connectionString,
            types: PersistencePostgres.typeParsers,
          }),
      ),
      (client) => Effect.promise(() => client.end()).pipe(Effect.timeoutOption(1000)),
    ).pipe(
      Effect.tap((client) =>
        Effect.tryPromise({
          try: () => client.connect(),
          catch: () => new AuthenticationPostgresConnectionError(),
        }).pipe(Effect.orDie),
      ),
    ),
  );

const postgresClientLayer = (connectionString: string) =>
  PgClient.layerFrom(
    PgClient.makeClient({
      url: Redacted.make(connectionString),
      acquireForStream: false,
      types: PersistencePostgres.typeParsers,
    }),
  );

export interface Input {
  readonly baseURL: string;
  readonly database: WebWorkerEnv["DATABASE"];
  readonly request: Request;
  readonly secret: Redacted.Redacted<string>;
}

/** Builds all stable services owned by one SvelteKit request. */
export const make = ({ baseURL, database, request, secret }: Input) => {
  const postgres = postgresClientLayer(database.connectionString);
  const persistence = PersistencePostgres.layer.pipe(Layer.provide(postgres));
  const application = Application.layer.pipe(
    Layer.provide(Layer.merge(NodeCrypto.layer, persistence)),
  );
  const authentication = Layer.unwrap(
    Effect.gen(function* () {
      const client = yield* AuthenticationPostgresClient;
      const authDatabase = drizzle({
        client,
        relations: { ...authSchema.authRelations },
      });
      return Authentication.layer({
        baseURL,
        database: authDatabase,
        request,
        secret,
      });
    }),
  ).pipe(Layer.provide(authenticationPostgresClientLayer(database.connectionString)));

  return ManagedRuntime.make(Layer.merge(application, authentication));
};

export type Runtime = ReturnType<typeof make>;

export * as WebRuntime from "./runtime.ts";
