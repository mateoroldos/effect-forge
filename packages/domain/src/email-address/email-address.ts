import { Schema } from "effect";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A syntactically valid address used to identify or contact a person. */
export const EmailAddress = Schema.String.pipe(
  Schema.check(Schema.isPattern(EMAIL_PATTERN)),
  Schema.brand("EmailAddress"),
);

/** A syntactically valid email address. */
export type EmailAddress = typeof EmailAddress.Type;
