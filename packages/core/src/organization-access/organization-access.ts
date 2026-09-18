import type { Principal } from "@effect-forge/domain/identity";
import { OrganizationId, type OrganizationMember } from "@effect-forge/domain/organization";
import { Context, Effect, Layer, Option, Schema } from "effect";
import { OrganizationMembership } from "./organization-membership.ts";
import { Permission } from "./permission.ts";

export interface Interface {
  readonly require: (
    principal: Principal,
    organizationId: OrganizationId,
    permission: Permission.Definition,
  ) => Effect.Effect<OrganizationMember, Denied | OrganizationMembership.Unavailable>;
}

export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/OrganizationAccess",
) {}

export class Denied extends Schema.TaggedError<Denied>()("OrganizationAccess.Denied", {
  organizationId: OrganizationId,
  permission: Permission.Key,
}) {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const memberships = yield* OrganizationMembership.Service;
    const require = Effect.fn("OrganizationAccess.require")(function* (
      principal: Principal,
      organizationId: OrganizationId,
      permission: Permission.Definition,
    ) {
      const member = yield* memberships.member(organizationId, principal.userId);
      if (Option.isNone(member) || !Permission.allows(permission, member.value.roles)) {
        return yield* new Denied({ organizationId, permission: permission.key });
      }
      return member.value;
    });
    return Service.of({ require });
  }),
);

export * as OrganizationAccess from "./organization-access.ts";
