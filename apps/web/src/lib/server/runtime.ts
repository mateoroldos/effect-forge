import { Application } from "@effect-forge/core/application";
import { PersistencePostgres } from "@effect-forge/database-postgres";
import * as authSchema from "@effect-forge/database-postgres/auth-schema";
import { NodeCrypto } from "@effect/platform-node";
import { drizzle } from "drizzle-orm/node-postgres";
import type { RequestEvent } from "@sveltejs/kit";
import { dev } from "$app/env";
import { Effect, Layer, ManagedRuntime } from "effect";
import { decodeAuthOrigin } from "./auth-origin.ts";
import { decodeAuthSecret } from "./auth-secret.ts";
import { Authentication } from "./authentication.ts";
import { Postgres } from "./postgres.ts";
import { Observability } from "./observability.ts";
import { RequestRunner } from "./request-runner.ts";

/** Builds all stable services owned by one SvelteKit request. */
export const make = (event: RequestEvent) => {
  const { platform, request } = event;
  if (platform === undefined) {
    throw new Error("SvelteKit platform environment is unavailable");
  }
  const env = platform.env;
  const baseURL = decodeAuthOrigin(env.AUTH_ORIGIN).origin;
  const secret = decodeAuthSecret(env.AUTH_SECRET);
  const connectionString = env.DATABASE.connectionString;
  const requestKind = event.isRemoteRequest ? "remote" : event.isDataRequest ? "data" : "request";
  const routeId = event.route.id;
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
  const spanName =
    requestKind === "remote"
      ? `Remote · ${request.method}`
      : requestKind === "data"
        ? `Data · ${route ?? request.method}`
        : `Request · ${request.method}${route === null ? "" : ` ${route}`}`;
  let remoteOperation: string | undefined;
  const runtime = ManagedRuntime.make(
    application.pipe(
      Layer.provideMerge(authentication),
      Layer.provideMerge(
        Layer.unwrap(
          Effect.sync(() =>
            Layer.span(
              remoteOperation === undefined
                ? spanName
                : `Remote · ${remoteOperation.replace(/^Remote\./, "")}`,
              {
                attributes: {
                  "app.request.kind": requestKind,
                  "app.span.kind": "request_scope",
                  "http.request.method": request.method,
                  "sveltekit.route_id": routeId ?? "unknown",
                },
              },
            ),
          ),
        ),
      ),
      Layer.provideMerge(
        Observability.layer({
          endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT,
          stage: env.DEPLOYMENT_ENVIRONMENT,
          dev,
        }),
      ),
    ),
  );

  const execute = RequestRunner.make(runtime, request.signal);
  const run: typeof execute = (name, program) => {
    // The first application operation names a remote request, including its later refreshes.
    if (requestKind === "remote") remoteOperation ??= name;
    return execute(name, program);
  };

  return { run, dispose: runtime.dispose };
};

export type Runtime = ReturnType<typeof make>;
export type Run = Runtime["run"];

export * as WebRuntime from "./runtime.ts";
