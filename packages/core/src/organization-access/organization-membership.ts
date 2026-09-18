import type { UserId } from "@effect-forge/domain/identity";
import type { OrganizationId, OrganizationMember } from "@effect-forge/domain/organization";
import { Context, Effect, type Option, Schema } from "effect";

export interface Interface {
  readonly member: (
    organizationId: OrganizationId,
    userId: UserId,
  ) => Effect.Effect<Option.Option<OrganizationMember>, Unavailable>;
}

/** Reads current membership from the tenant authority, independently of session selection. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/OrganizationMembership",
) {}

export class Unavailable extends Schema.TaggedError<Unavailable>()(
  "OrganizationMembership.Unavailable",
  {
    cause: Schema.Defect(),
  },
) {}

export * as OrganizationMembership from "./organization-membership.ts";
