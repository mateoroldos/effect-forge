import { Schema } from "effect";
import { EmailAddress } from "../email-address/email-address.ts";

/** A stable application-owned user identifier. */
export const UserId = Schema.String.pipe(Schema.check(Schema.isUUID(4)), Schema.brand("UserId"));

/** A stable application-owned user identifier. */
export type UserId = typeof UserId.Type;

/** A non-empty display name of at most 100 characters. */
export const UserName = Schema.String.pipe(
  Schema.check(Schema.isTrimmed()),
  Schema.check(Schema.isMinLength(1), Schema.isMaxLength(100)),
  Schema.brand("UserName"),
);

/** A user's display name. */
export type UserName = typeof UserName.Type;

/** An application-owned user. */
export const User = Schema.Struct({ id: UserId, email: EmailAddress, name: UserName });

/** An application-owned user. */
export interface User extends Schema.Schema.Type<typeof User> {}

/** The application identity associated with an authenticated request. */
export const Principal = Schema.Struct({ userId: UserId, email: EmailAddress, name: UserName });

/** The application identity associated with an authenticated request. */
export interface Principal extends Schema.Schema.Type<typeof Principal> {}
