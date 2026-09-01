import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as Drizzle from "alchemy/Drizzle";
import * as Neon from "alchemy/Neon";
import { DateTime, Effect } from "effect";

const branchPolicy = Effect.fn(function* (stage: string) {
  if (stage.startsWith("pr-")) {
    const expiresAt = DateTime.add(yield* DateTime.now, { days: 7 });
    return { expiresAt: DateTime.formatIso(expiresAt) };
  }
  return {};
});

/** Generates PostgreSQL migrations before provisioning the database. */
export const postgres = Effect.gen(function* () {
  const { stage } = yield* Alchemy.Stack;
  const schema = yield* Drizzle.Schema("ApiSchema", {
    schema: "./adapters/database-postgres/src/schema.ts",
    out: "./adapters/database-postgres/drizzle",
  });

  const ownsProject = stage === "prod" || stage === "staging";
  const project = ownsProject
    ? yield* Neon.Project("ApiDatabase", {
        region: "aws-us-east-1",
        migrations: schema,
      })
    : yield* Neon.Project.ref("ApiDatabase", { stage: "staging" });
  const branch = yield* Neon.Branch("ApiDatabaseBranch", {
    project,
    migrations: schema,
    ...(yield* branchPolicy(stage)),
  });

  return { branch, project, schema };
});

/**
 * Addresses the branch directly, for work that runs before a request exists.
 *
 * Hyperdrive mints its connection string per invocation inside the Worker, so deploy-time
 * migrations cannot use it.
 */
export const originUrl = Effect.map(postgres, ({ branch }) => branch.connectionUri);

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
