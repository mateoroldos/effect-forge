import starterPrompt from "../../../docs/template/start-project.md?raw";

export const site = {
  name: "Effect Forge",
  description:
    "A TypeScript foundation for humans and agents. Built with Effect, strong types, clear boundaries, and shared engineering standards.",
  repository: "https://github.com/mateoroldos/effect-forge",
  vision: "https://github.com/mateoroldos/effect-forge/blob/main/VISION.md",
  notes: "https://mateoroldos.com/blog/notes-on-agentic-coding/",
  install: "bunx degit mateoroldos/effect-forge my-app",
  starterPrompt,
} as const;
