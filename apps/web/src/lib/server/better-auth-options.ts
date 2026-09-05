import type { BetterAuthOptions } from "better-auth";

/** Provider behavior shared by the Web runtime and schema generator. */
export const betterAuthOptions = {
  emailAndPassword: { enabled: true },
  logger: { disabled: true },
  telemetry: { enabled: false },
  rateLimit: { storage: "database" },
  advanced: {
    cookiePrefix: "ef",
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
  },
  experimental: { instrumentation: { enabled: false } },
} as const satisfies BetterAuthOptions;
