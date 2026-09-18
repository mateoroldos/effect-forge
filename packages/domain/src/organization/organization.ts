import { Schema } from "effect";
import { UserId } from "../identity/identity.ts";

/** Provider-owned opaque organization identifier. */
export const OrganizationId = Schema.String.pipe(
  Schema.check(Schema.isTrimmed(), Schema.isMinLength(1), Schema.isMaxLength(255)),
  Schema.brand("OrganizationId"),
);
export type OrganizationId = typeof OrganizationId.Type;

export const Organization = Schema.Struct({
  id: OrganizationId,
  name: Schema.String,
  slug: Schema.String,
});
export interface Organization extends Schema.Schema.Type<typeof Organization> {}

export const OrganizationRole = Schema.Literals(["owner", "admin", "member"]);
export type OrganizationRole = typeof OrganizationRole.Type;

export const OrganizationMember = Schema.Struct({
  organizationId: OrganizationId,
  userId: UserId,
  roles: Schema.NonEmptyArray(OrganizationRole),
});
export interface OrganizationMember extends Schema.Schema.Type<typeof OrganizationMember> {}
