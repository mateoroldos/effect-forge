import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Neon from "alchemy/Neon";
import { Effect } from "effect";

/** Generates PostgreSQL migrations before provisioning the database. */
export const postgres = Effect.gen(function* () {
  const schema = yield* Drizzle.Schema("ApiSchema", {
    schema: "./packages/database/src/workspace/schema.ts",
    out: "./packages/database/drizzle",
  });
  const project = yield* Neon.Project("ApiDatabase");
  const branch = yield* Neon.Branch("ApiDatabaseBranch", {
    project,
    migrations: schema,
  });

  return { branch, project, schema };
});

/** Provides edge-pooled database connectivity with read-after-write consistency. */
export const hyperdrive = Effect.gen(function* () {
  const { branch } = yield* postgres;

  return yield* Cloudflare.Hyperdrive.Connection("ApiDatabaseConnection", {
    origin: branch.origin,
    dev: branch.pooledOrigin,
    caching: { disabled: true },
  });
});

export * as Database from "./database.ts";
