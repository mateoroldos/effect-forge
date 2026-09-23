export const site = {
  name: "Effect Forge",
  description:
    "A TypeScript foundation for humans and agents. Built with Effect, strong types, clear boundaries, and shared engineering standards.",
  repository: "https://github.com/mateoroldos/effect-forge",
  vision: "https://github.com/mateoroldos/effect-forge/blob/main/VISION.md",
  notes: "https://mateoroldos.com/blog/notes-on-agentic-coding/",
  install: "bunx degit mateoroldos/effect-forge my-app",
  starterPrompt: `Help me start a project using https://github.com/mateoroldos/effect-forge.

First, read its VISION.md, AGENTS.md, and relevant code. Then interview me about what I want to build.

Ask one question at a time. Give a recommendation when useful. Use concrete examples to expose tradeoffs. Challenge assumptions, but don't ask me to repeat facts you can find in the repository.

Establish the product's users, purpose, main workflows, boundaries, and signs of success. Stop interviewing when we have enough clarity to proceed.

Summarize our decisions. Recommend which parts of Effect Forge to keep, adapt, or omit. Preserve its engineering standards without assuming my product needs its web stack, auth, or organizations.

Once we agree, write a short VISION.md that guides humans and agents. Scaffold the project, adapt its agent instructions, and write a README.md with accurate setup and verification commands. Run the checks and report what remains incomplete.`,
} as const;
