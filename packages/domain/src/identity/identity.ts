import { Schema } from "effect";

/** Better Auth's canonical opaque user identifier. */
export const UserId = Schema.String.pipe(
  Schema.check(Schema.isTrimmed()),
  Schema.check(Schema.isMinLength(1), Schema.isMaxLength(255)),
  Schema.brand("UserId"),
);

/** Better Auth's canonical opaque user identifier. */
export type UserId = typeof UserId.Type;

/** The authenticated identity authorized to perform an application operation. */
export const Principal = Schema.Struct({ userId: UserId });

/** The authenticated identity authorized to perform an application operation. */
export interface Principal extends Schema.Schema.Type<typeof Principal> {}
