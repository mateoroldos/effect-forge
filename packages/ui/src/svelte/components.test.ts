import { globSync, readFileSync } from "node:fs";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vitest";

// svelte-check reports type errors but not compile errors: it passed a component whose
// markup the compiler rejects. This is the only thing that proves the surface builds.
const components = globSync("src/svelte/**/*.svelte").sort();

describe.each(["client", "server"] as const)("%s build", (generate) => {
  it.each(components)("compiles %s", (filename) => {
    expect(() => compile(readFileSync(filename, "utf8"), { filename, generate })).not.toThrow();
  });
});
