import { Application } from "@effect-forge/core/application";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { NodeCrypto } from "@effect/platform-node";
import { drizzle } from "drizzle-orm/node-postgres";
import { Effect, Layer, ManagedRuntime, Redacted } from "effect";
import { Authentication } from "./authentication.ts";
import { Postgres } from "./postgres.ts";
import { Observability } from "./observability.ts";
import { RequestRunner } from "./request-runner.ts";

export interface Input {
  readonly baseURL: string;
  readonly connectionString: string;
  readonly request: Request;
  readonly routeId: string | null;
  readonly secret: Redacted.Redacted<string>;
  readonly stage: string;
  readonly dev: boolean;
  readonly telemetry: { readonly endpoint: string | undefined };
}

/** Builds all stable services owned by one SvelteKit request. */
export const make = ({
  baseURL,
  connectionString,
  request,
  routeId,
  secret,
  stage,
  dev,
  telemetry,
}: Input) => {
  const postgres = Postgres.applicationLayer(connectionString);
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
  ).pipe(Layer.provide(Postgres.authenticationLayer(connectionString)));

  const route = routeId === null ? null : routeId.replace(/\/\([^/)]+\)(?=\/|$)/g, "") || "/";
  const runtime = ManagedRuntime.make(
    application.pipe(
      Layer.provideMerge(authentication),
      Layer.provideMerge(
        Layer.span(`${request.method} ${route ?? "(unmatched route)"} (runtime)`, {
          attributes: {
            "http.request.method": request.method,
            "sveltekit.route_id": routeId ?? "unknown",
          },
        }),
      ),
      Layer.provideMerge(Observability.layer({ ...telemetry, stage, dev })),
    ),
  );

  return { run: RequestRunner.make(runtime, request.signal), dispose: runtime.dispose };
};

export type Runtime = ReturnType<typeof make>;
export type Run = Runtime["run"];

export * as WebRuntime from "./runtime.ts";
