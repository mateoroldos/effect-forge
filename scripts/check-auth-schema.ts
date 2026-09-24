const root = new URL("../", import.meta.url).pathname;
const generatedPath = "/tmp/opencode/effect-forge-auth-schema.ts";
const schemaPath = `${root}adapters/database-postgres/src/auth/schema.ts`;

const run = (command: ReadonlyArray<string>) => {
  const child = Bun.spawn([...command], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
  });
  return child.exited.then((exitCode) => {
    if (exitCode !== 0) process.exit(exitCode);
  });
};

await run([
  `${root}node_modules/.bin/auth`,
  "generate",
  "--config",
  "apps/web/auth.config.ts",
  "--output",
  generatedPath,
  "--yes",
]);

await Bun.write(
  generatedPath,
  `/** @effect-diagnostics globalDate:skip-file */\n${await Bun.file(generatedPath).text()}`,
);
await run([`${root}node_modules/.bin/oxfmt`, generatedPath]);
const generated = await Bun.file(generatedPath).text();
if (process.argv.includes("--write")) {
  await Bun.write(schemaPath, generated);
} else if (generated !== (await Bun.file(schemaPath).text())) {
  await Bun.write(
    Bun.stderr,
    "Better Auth options and the checked-in PostgreSQL schema differ.\n" +
      "Run `bun run auth:schema:generate`, then generate a database migration.\n",
  );
  process.exitCode = 1;
}
