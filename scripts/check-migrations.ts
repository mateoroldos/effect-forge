import { BunRuntime, BunServices } from "@effect/platform-bun";
import { Effect, FileSystem, Path, Schema } from "effect";
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process";
import { fileURLToPath } from "node:url";

class MigrationCheckError extends Schema.TaggedError<MigrationCheckError>()("MigrationCheckError", {
  message: Schema.String,
}) {}

const checkMigrations = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const adapter = fileURLToPath(new URL("../adapters/database-postgres/", import.meta.url));
  const temporary = yield* fs.makeTempDirectoryScoped({ prefix: "effect-forge-migrations-" });
  const migrations = path.join(temporary, "drizzle");
  const config = path.join(temporary, "drizzle.config.ts");

  const contents = Effect.fn("migrationContents")(function* () {
    const entries = yield* fs.readDirectory(migrations, { recursive: true });
    const files: Array<readonly [string, string]> = [];
    for (const entry of entries.sort()) {
      const file = path.join(migrations, entry);
      if ((yield* fs.stat(file)).type === "File") {
        files.push([entry, yield* fs.readFileString(file)]);
      }
    }
    return files;
  });

  yield* fs.copy(path.join(adapter, "drizzle"), migrations);
  const before = yield* contents();
  const quote = Schema.encodeEffect(Schema.fromJsonString(Schema.String));
  const configImport = yield* quote(path.join(adapter, "drizzle.config.ts"));
  const outputDirectory = yield* quote(migrations);
  yield* fs.writeFileString(
    config,
    `import config from ${configImport};\n` +
      `export default { ...config, out: ${outputDirectory} };\n`,
  );

  const child = yield* spawner.spawn(
    ChildProcess.make(
      "bun",
      [path.join(adapter, "node_modules/drizzle-kit/bin.cjs"), "generate", "--config", config],
      {
        cwd: adapter,
        stdin: "ignore",
        stdout: "inherit",
        stderr: "inherit",
      },
    ),
  );
  const exitCode = yield* child.exitCode.pipe(Effect.timeout("60 seconds"));
  if (exitCode !== ChildProcessSpawner.ExitCode(0)) {
    return yield* new MigrationCheckError({
      message: `Migration generation exited with code ${exitCode}; resolve errors or missing rename hints.`,
    });
  }
  const after = yield* contents();
  if (
    after.length !== before.length ||
    after.some(([name, text], index) => name !== before[index]?.[0] || text !== before[index]?.[1])
  ) {
    return yield* new MigrationCheckError({
      message: "Schema and migrations differ. Run `bun run db:generate` and commit the migration.",
    });
  }
});

BunRuntime.runMain(checkMigrations.pipe(Effect.scoped, Effect.provide(BunServices.layer)));
