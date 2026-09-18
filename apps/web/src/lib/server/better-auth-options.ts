import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { organization } from "better-auth/plugins/organization";
import { Result, Schema } from "effect";

const decodeOrganizationSlug = Schema.decodeUnknownResult(
  Schema.String.check(
    Schema.isTrimmed(),
    Schema.isPattern(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    Schema.isMaxLength(48),
  ),
);

const validateOrganizationSlug = (slug: string | undefined): void => {
  if (Result.isFailure(decodeOrganizationSlug(slug))) {
    throw new APIError("BAD_REQUEST", {
      code: "INVALID_ORGANIZATION_SLUG",
      message: "Use 1–48 lowercase letters, numbers, and single hyphens between words.",
    });
  }
};

/** Provider behavior shared by the Web runtime and schema generator. */
export const betterAuthOptions = {
  plugins: [
    organization({
      organizationHooks: {
        // oxlint-disable-next-line effecttsgo/async-function -- Better Auth owns the Promise-based hook boundary.
        beforeCreateOrganization: async ({ organization }) => {
          validateOrganizationSlug(organization.slug);
        },
        // oxlint-disable-next-line effecttsgo/async-function -- Better Auth owns the Promise-based hook boundary.
        beforeUpdateOrganization: async ({ organization }) => {
          if (organization.slug !== undefined) validateOrganizationSlug(organization.slug);
        },
      },
    }),
  ],
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
