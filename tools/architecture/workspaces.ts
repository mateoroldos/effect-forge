interface Workspace {
  readonly name: string;
  readonly directory: string;
  readonly dependencies: ReadonlyArray<string>;
}

export const workspaceScope = "@effect-forge/";

export const workspaces: ReadonlyArray<Workspace> = [
  { name: "@effect-forge/domain", directory: "packages/domain", dependencies: [] },
  {
    name: "@effect-forge/core",
    directory: "packages/core",
    dependencies: ["@effect-forge/domain"],
  },
  { name: "@effect-forge/ui", directory: "packages/ui", dependencies: [] },
  {
    name: "@effect-forge/database-postgres",
    directory: "adapters/database-postgres",
    dependencies: ["@effect-forge/core", "@effect-forge/domain"],
  },
  { name: "@effect-forge/site", directory: "apps/site", dependencies: ["@effect-forge/ui"] },
  {
    name: "@effect-forge/web",
    directory: "apps/web",
    dependencies: [
      "@effect-forge/core",
      "@effect-forge/domain",
      "@effect-forge/ui",
      "@effect-forge/database-postgres",
    ],
  },
];
