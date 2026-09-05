import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { drizzle } from "drizzle-orm/node-postgres";
import { betterAuthOptions } from "./src/lib/server/better-auth-options.ts";

/** CLI-only instance used to derive the checked-in Better Auth schema. */
export const auth = betterAuth({
  ...betterAuthOptions,
  baseURL: "http://localhost:5173",
  database: drizzleAdapter(drizzle.mock(), { provider: "pg" }),
  secret: "schema-generation-only-secret-value",
});
