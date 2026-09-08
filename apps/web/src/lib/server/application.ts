import { Application } from "@effect-forge/core/application";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import { NodeCrypto } from "@effect/platform-node";
import * as SQL from "alchemy/SQL/Postgres";
import { Effect, Layer, ManagedRuntime } from "effect";
import type { WebWorkerEnv } from "../../../worker.ts";

export type Runtime = ManagedRuntime.ManagedRuntime<Application.Services, never>;

/** Builds the stable application services shared by operations in one request. */
export const make = (database: WebWorkerEnv["DATABASE"]): Runtime => {
  const postgres = SQL.PostgresLayer({ url: Effect.succeed(database.connectionString) });
  const persistence = PersistencePostgres.layer.pipe(Layer.provide(postgres));
  const application = Application.layer.pipe(
    Layer.provide(Layer.merge(NodeCrypto.layer, persistence)),
  );
  return ManagedRuntime.make(application);
};

/** Runs an operation without adding request-specific values to the stable runtime. */
export const run = <A, E>(
  runtime: Runtime,
  operation: Effect.Effect<A, E, Application.Services>,
): Promise<A> => runtime.runPromise(operation);

export * as ApplicationRuntime from "./application.ts";
