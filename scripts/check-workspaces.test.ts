import { Schema } from "effect";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { workspaces } from "../tools/architecture/workspaces.ts";

const repository = fileURLToPath(new URL("../", import.meta.url));
const oxlint = path.join(repository, "node_modules/.bin/oxlint");

function fixture(files: Readonly<Record<string, string>>, check: (root: string) => void) {
  const root = mkdtempSync(path.join(tmpdir(), "workspaces-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      const filename = path.join(root, name);
      mkdirSync(path.dirname(filename), { recursive: true });
      writeFileSync(filename, content);
    }
    check(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function run(cwd: string, executable: string, args: ReadonlyArray<string>) {
  const result = spawnSync(executable, args, { cwd, encoding: "utf8", timeout: 10_000 });
  if (result.error) throw result.error;
  return { output: result.stdout + result.stderr, exitCode: result.status };
}

it("checks allowed dependencies, all dependency sections, and workspace registration", () => {
  const manifests = Object.fromEntries(
    workspaces.map(({ name, directory }) => [
      `${directory}/package.json`,
      JSON.stringify({ name }),
    ]),
  );
  fixture(manifests, (root) => {
    const manifest = path.join(root, "packages/core/package.json");
    const checker = path.join(repository, "scripts/check-workspaces.ts");
    writeFileSync(
      manifest,
      '{"name":"@effect-forge/core","dependencies":{"@effect-forge/domain":"workspace:*"}}',
    );
    const valid = run(root, "bun", [checker]);
    expect(valid.exitCode, valid.output).toBe(0);

    writeFileSync(
      manifest,
      JSON.stringify({
        name: "@effect-forge/core",
        dependencies: { "@effect-forge/site": "workspace:*" },
        devDependencies: { "@effect-forge/web": "workspace:*" },
        peerDependencies: { "@effect-forge/ui": "workspace:*" },
        optionalDependencies: { "@effect-forge/database-postgres": "workspace:*" },
      }),
    );
    const forbidden = run(root, "bun", [checker]);
    expect(forbidden.exitCode).toBe(1);
    for (const target of ["site", "web", "ui", "database-postgres"]) {
      expect(forbidden.output).toContain(
        `@effect-forge/core must not depend on @effect-forge/${target}`,
      );
    }

    for (const [content, diagnostic] of [
      ['{"name":"@effect-forge/new"}', "add @effect-forge/new to tools/architecture/workspaces.ts"],
      ['{"name":"@effect-forge/domain"}', "belongs in packages/domain"],
      ['{"name":42}', "packages/core/package.json: invalid package manifest"],
    ] as const) {
      writeFileSync(manifest, content);
      const result = run(root, "bun", [checker]);
      expect(result.exitCode).toBe(1);
      expect(result.output).toContain(diagnostic);
    }
    rmSync(path.join(root, "apps/site/package.json"));
    const missing = run(root, "bun", [checker]);
    expect(missing.exitCode).toBe(1);
    expect(missing.output).toContain(
      "apps/site/package.json: missing manifest for @effect-forge/site",
    );
  });
});

it("checks ESM boundaries through Oxlint, including component scripts and relative paths", () => {
  const forbidden = {
    "packages/domain/src/static.ts": 'import "@effect-forge/core/todo-directory";',
    "packages/domain/src/relative.ts": 'import "../../core/src/application.ts";',
    "packages/domain/src/reexport.ts": 'export * from "@effect-forge/ui";',
    "packages/domain/src/named.ts": 'export { value } from "@effect-forge/core";',
    "packages/domain/src/type.ts": 'import type { Value } from "@effect-forge/core";',
    "packages/domain/src/import-type.ts": 'type Value = import("@effect-forge/core").Value;',
    "packages/domain/src/dynamic.ts": 'import("@effect-forge/core");',
    "packages/domain/src/template.ts": "import(`@effect-forge/core`);",
    "packages/core/src/adapter.ts":
      'import "../../../adapters/database-postgres/src/persistence-postgres.ts";',
    "apps/web/src/site.ts": 'import "../../site/src/site.ts";',
    "apps/site/src/forbidden.astro": '---\nimport "@effect-forge/core";\n---\n<p>Example</p>',
    "packages/ui/src/forbidden.svelte": '<script lang="ts">import "@effect-forge/core";</script>',
    "packages/domain/src/unknown.ts": 'import "@effect-forge/unknown";',
    "packages/domain/src/prefix.ts": 'import "@effect-forge/domain-extra";',
  };
  fixture(
    {
      ...forbidden,
      "packages/core/src/allowed.ts":
        'import "@effect-forge/domain/todo"; import "./local.ts"; import "effect"; import "@other/core";',
      "adapters/database-postgres/src/allowed.ts":
        'import "@effect-forge/core/todo-store"; import "../../../packages/domain/src/todo/todo.ts";',
      "apps/web/src/allowed.ts":
        'import "@effect-forge/core"; import "@effect-forge/database-postgres"; import "@effect-forge/ui";',
      "apps/site/src/allowed.ts": 'import "@effect-forge/ui";',
      "packages/domain/src/self.ts": 'export * from "@effect-forge/domain/todo";',
      "packages/domain/src/computed.ts": 'const name = "@effect-forge/core"; import(name);',
      "tools/oxlint/workspace-boundaries.ts": readFileSync(
        path.join(repository, "tools/oxlint/workspace-boundaries.ts"),
        "utf8",
      ),
      "tools/architecture/workspaces.ts": readFileSync(
        path.join(repository, "tools/architecture/workspaces.ts"),
        "utf8",
      ),
      ".oxlintrc.json": JSON.stringify({
        categories: { correctness: "off" },
        jsPlugins: ["./tools/oxlint/workspace-boundaries.ts"],
        rules: { "workspace-boundaries/no-cross-workspace-imports": "error" },
      }),
    },
    (root) => {
      symlinkSync(path.join(repository, "node_modules"), path.join(root, "node_modules"));
      writeFileSync(
        path.join(root, "packages/domain/src/absolute.ts"),
        `import ${JSON.stringify(path.join(root, "packages/core/src/application.ts"))};`,
      );
      const result = run(root, oxlint, [
        "-c",
        ".oxlintrc.json",
        "--format",
        "json",
        "apps",
        "packages",
        "adapters",
      ]);
      expect(result.exitCode).toBe(1);
      const report = Schema.decodeSync(
        Schema.fromJsonString(
          Schema.Struct({
            diagnostics: Schema.Array(
              Schema.Struct({ filename: Schema.String, code: Schema.String }),
            ),
          }),
        ),
      )(result.output);
      expect(
        report.diagnostics.every(
          (item) => item.code === "workspace-boundaries(no-cross-workspace-imports)",
        ),
      ).toBe(true);
      expect(report.diagnostics.map((item) => item.filename).sort()).toEqual(
        [...Object.keys(forbidden), "packages/domain/src/absolute.ts"].sort(),
      );
    },
  );
});

it("rejects CommonJS imports with the repository's built-in lint rule", () => {
  fixture({ "require.ts": 'require("effect");\nimport effect = require("effect");' }, (root) => {
    const result = run(root, oxlint, [
      "-c",
      path.join(repository, ".oxlintrc.json"),
      "--format",
      "json",
      "require.ts",
    ]);
    expect(result.exitCode).toBe(1);
    expect(result.output.match(/"code": "typescript\(no-require-imports\)"/g)).toHaveLength(2);
  });
});
