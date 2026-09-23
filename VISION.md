# Vision

## What I am building

A **TypeScript and Effect foundation for my products**.

Each new project needs structure, tooling, and coding standards. I built Effect
Forge to make those decisions once and make them well.

It puts type-driven development and Effect into practice through clear boundaries,
working examples, and automated checks. I refine these choices here so each product
starts from a solid base for humans and agents.

Others should be able to use it. Humans and agents should be able to learn from it.

## The engineering baseline

- **Type-driven models.** Parse untrusted input. Make valid states, expected
  failures, and dependencies explicit in types.
- **Clear ownership.** Keep domain logic separate from frameworks and providers.
  Give each responsibility one home and a simple interface.
- **Testable behavior.** Compose services with Effect Layers. Test through their
  public interfaces with substitute dependencies.
- **Enforced standards.** Check formatting, lint, types, architecture, migrations,
  and tests together. Keep the feedback fast.
- **Working infrastructure.** Include logs, traces, deployment, and separate
  development and preview environments.
- **Shared guidance.** Keep agent instructions and examples beside the code.
  Explain the decisions so humans and agents can apply them consistently.

The web app uses SvelteKit, Better Auth, PostgreSQL, Bun, Cloudflare, and Alchemy.

## How to use it

### Start with an interview

Give your coding agent the starter prompt. It studies this repository and asks
about your product, one question at a time. Agree on who it serves, what it does,
and what it leaves out.

The agent recommends what to keep, adapt, or omit. Once you agree, it writes your
VISION.md, scaffolds the project, and documents setup and checks in README.md.
Apply the existing engineering standards; adapt the application to your product.

If the whole stack fits, you can also copy the template directly.

### Build with an agent

The agent follows an existing feature and the repository rules. It explains the
change and reports which checks passed. You can review the code and inspect logs
and traces when something fails.

### Reuse the patterns

Building a CLI or another kind of app? Use the repository as a reference for
yourself or an agent. Take the patterns and tools you need.

## How I choose improvements

- **Clarity and correctness first.** Improve the foundation when a design becomes
  simpler, clearer, or more correct. Every abstraction and tool should earn its place.
- **Choose good defaults.** Maintain one stack that works well together.
  Projects that start here own their code and can choose differently.
- **Enforce important rules.** Use types and checks to catch mistakes.
  Keep checks fast and failures easy to investigate.
- **Make additions earn their place.** Solve a recurring problem in real projects
  or demonstrate an important boundary. Avoid features added just to match other starters.

## The example app

I mostly want to build SaaS products. The example lets people sign up, create an
organization, and share todos. It shows how auth, permissions, and data isolation work.

Keep it small enough to understand and useful to build from. It should not become
a catalogue of SaaS features. Keep what your product needs. Change the rest.

## North star

> Start with carefully considered decisions. Spend your energy building the
> product. Keep the code a pleasure for humans and agents to understand and grow.
