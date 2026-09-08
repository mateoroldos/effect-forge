import { Schema } from "effect";

/** A same-document path that cannot be normalized into an external URL. */
export const ReturnPath = Schema.String.pipe(Schema.check(Schema.isPattern(/^\/(?!\/)[^\\]*$/)));
