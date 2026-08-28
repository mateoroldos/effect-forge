const allowedDependencies: Readonly<Record<string, ReadonlySet<string>>> = {
  "@effect-forge/api": new Set([
    "@effect-forge/contracts",
    "@effect-forge/core",
    "@effect-forge/database-postgres",
    "@effect-forge/domain",
  ]),
  "@effect-forge/contracts": new Set(["@effect-forge/domain"]),
  "@effect-forge/core": new Set(["@effect-forge/domain"]),
  "@effect-forge/database-postgres": new Set(["@effect-forge/core", "@effect-forge/domain"]),
  "@effect-forge/design-system": new Set(),
  "@effect-forge/domain": new Set(),
  "@effect-forge/site": new Set(["@effect-forge/design-system"]),
  "@effect-forge/web": new Set([
    "@effect-forge/contracts",
    "@effect-forge/design-system",
    "@effect-forge/domain",
  ]),
};

const manifests = [
  ...new Bun.Glob("apps/*/package.json").scanSync(),
  ...new Bun.Glob("packages/*/package.json").scanSync(),
  ...new Bun.Glob("adapters/*/package.json").scanSync(),
];

const violations: Array<string> = [];

for (const manifestPath of manifests) {
  const manifest = await Bun.file(manifestPath).json();
  const allowed = allowedDependencies[manifest.name];

  if (allowed === undefined) {
    violations.push(`${manifestPath}: add ${manifest.name} to the architecture rules`);
    continue;
  }

  const dependencies = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies,
  };

  for (const dependency of Object.keys(dependencies)) {
    if (dependency.startsWith("@effect-forge/") && !allowed.has(dependency)) {
      violations.push(`${manifest.name} must not depend on ${dependency}`);
    }
  }
}

if (violations.length > 0) {
  await Bun.write(Bun.stderr, `${violations.join("\n")}\n`);
  process.exitCode = 1;
}
