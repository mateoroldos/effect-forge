# Vision

A **TypeScript and Effect foundation for my products**.

Each project needs structure, tooling, and standards. I built Effect Forge to
make those decisions once, refine them through use, and carry them into the next
product. Others should be able to build on it or learn from it.

Code and guidance are both part of the foundation. They should make work easier
to understand, adapt, and verify—for humans and agents.

## Engineering baseline

- **Type-driven models:** parse untrusted input; express valid states, failures,
  and dependencies in types.
- **Clear ownership:** separate application logic from frameworks and providers.
  Give each responsibility one home and a simple interface.
- **Testable behavior:** compose Effect Layers and test public interfaces with
  substitute dependencies.
- **Enforced standards:** check formatting, lint, types, boundaries, migrations,
  and tests together. Keep feedback fast and failures easy to investigate.
- **Working infrastructure:** logs, traces, deployment, and separate development
  and preview environments.
- **Shared guidance:** keep instructions and working examples beside the code.

## Scope

I mostly build SaaS products. The small example has accounts, organizations, and
shared todos to demonstrate auth, permissions, and data isolation. It uses
SvelteKit, Better Auth, PostgreSQL, Bun, Cloudflare, and Alchemy.

Keep the example useful and small, not a catalogue of SaaS features. Products own
their code: adapt the stack, remove unneeded parts, or reuse patterns.

## Choosing improvements

Prefer clarity and correctness. Maintain one working set of defaults. Add tools,
abstractions, or features only to solve a recurring product need or demonstrate
an important boundary—not to match other starters.

Start with the [product interview](docs/template/start-project.md), or follow the
[README](README.md) to run the example and explore its patterns.

## North Star

> Make the engineering decisions once. Spend your energy on the product.
> Keep the code a pleasure for humans and agents to understand and grow.
