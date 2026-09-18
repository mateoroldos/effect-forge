// oxlint-disable-next-line effecttsgo/node-builtin-import -- Vitest fixture discovery is synchronous.
import { globSync, readFileSync } from "node:fs";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vitest";

// Complement svelte-check by exercising client and server compilation for every component.
const components = globSync("src/ui/**/*.svelte").sort();

describe.each(["client", "server"] as const)("%s build", (generate) => {
  it.each(components)("compiles %s", (filename) => {
    expect(() => compile(readFileSync(filename, "utf8"), { filename, generate })).not.toThrow();
  });
});
