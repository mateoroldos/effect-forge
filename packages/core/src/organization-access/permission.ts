import type { OrganizationRole } from "@effect-forge/domain/organization";
import { Schema } from "effect";

export const Key = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/)),
  Schema.brand("PermissionKey"),
);
export type Key = typeof Key.Type;

export interface Definition {
  readonly key: Key;
  readonly grantedTo: ReadonlyArray<Exclude<OrganizationRole, "owner">>;
}

const decodeKey = Schema.decodeSync(Key);

/** Capabilities declare delegated authority; owners always retain access. */
export const define = (input: {
  readonly key: string;
  readonly grantedTo: Definition["grantedTo"];
}): Definition =>
  Object.freeze({ key: decodeKey(input.key), grantedTo: Object.freeze([...input.grantedTo]) });

export const allows = (permission: Definition, roles: ReadonlyArray<OrganizationRole>): boolean =>
  roles.some((role) => role === "owner" || permission.grantedTo.includes(role));

export * as Permission from "./permission.ts";
