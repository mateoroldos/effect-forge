import { makeSvelteKitConfigPlugin } from "@alchemy.run/frontend-frameworks/sveltekit";
import { makeCloudflareAdapter } from "@alchemy.run/frontend-frameworks/sveltekit/cloudflare";
import { NodeRuntime } from "@effect/platform-node";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Effect } from "effect";
import { Client } from "pg";
import { preview } from "vite";

const server = Effect.gen(function* () {
  const database = yield* Effect.acquireRelease(
    Effect.promise(() => new PostgreSqlContainer("postgres:17-alpine").start()),
    (container) => Effect.promise(() => container.stop()),
  );

  yield* Effect.gen(function* () {
    const client = yield* Effect.acquireRelease(
      Effect.sync(() => new Client({ connectionString: database.getConnectionUri() })),
      (client) => Effect.promise(() => client.end()),
    );
    yield* Effect.promise(() => client.connect());
    yield* Effect.promise(() =>
      migrate(drizzle({ client }), {
        migrationsFolder: "../../adapters/database-postgres/drizzle",
      }),
    );
  }).pipe(Effect.scoped);

  const adapter = yield* Effect.acquireRelease(
    Effect.sync(() =>
      makeCloudflareAdapter({
        platform: {
          env: {
            AUTH_ORIGIN: "http://127.0.0.1:4173",
            AUTH_SECRET: "playwright-local-secret-not-for-deployment",
            DATABASE: { connectionString: database.getConnectionUri() },
            SEARCH_INDEXABLE: "false",
          },
        },
      }),
    ),
    (adapter) => Effect.promise(() => adapter.dispose()),
  );

  yield* Effect.acquireRelease(
    Effect.promise(() =>
      preview({
        plugins: [makeSvelteKitConfigPlugin({ adapter })],
        preview: { host: "127.0.0.1", port: 4173, strictPort: true },
      }),
    ),
    (server) => Effect.promise(() => server.close()),
  );
  return yield* Effect.never;
});

NodeRuntime.runMain(server.pipe(Effect.scoped));
