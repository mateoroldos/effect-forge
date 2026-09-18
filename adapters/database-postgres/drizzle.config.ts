import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: ["./src/auth/schema.ts", "./src/workspace/schema.ts", "./src/todo/schema.ts"],
});
