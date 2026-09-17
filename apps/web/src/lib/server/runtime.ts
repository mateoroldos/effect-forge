import { Application } from "@effect-forge/core/application";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { NodeCrypto } from "@effect/platform-node";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import type { WebWorkerEnv } from "../../../worker.ts";
import { Authentication } from "./authentication.ts";
import { Postgres } from "./postgres.ts";

export interface Input {
  readonly baseURL: string;
  readonly database: WebWorkerEnv["DATABASE"];
  readonly request: Request;
  readonly secret: Redacted.Redacted<string>;
}

/** Builds all stable services owned by one SvelteKit request. */
export const make = ({ baseURL, database, request, secret }: Input) => {
  const postgres = Postgres.sqlLayer(database.connectionString);
  const persistence = PersistencePostgres.layer.pipe(Layer.provide(postgres));
  const application = Application.layer.pipe(
    Layer.provide(Layer.merge(NodeCrypto.layer, persistence)),
  );
  const authentication = Layer.unwrap(
    Effect.gen(function* () {
      const client = yield* Postgres.AuthClient;
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
  ).pipe(Layer.provide(Postgres.authLayer(database.connectionString)));

  return ManagedRuntime.make(Layer.merge(application, authentication));
};

export type Runtime = ReturnType<typeof make>;

export * as WebRuntime from "./runtime.ts";
