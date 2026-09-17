import { Schema } from "effect";

/** A same-document path that cannot be normalized into an external URL. */
export const ReturnPath = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\/(?!\/)[^\\\p{Cc}]*$/u)),
);
export type ReturnPath = typeof ReturnPath.Type;

/** Reads a safe post-authentication destination from a page URL. */
export const fromURL = (url: {
  readonly searchParams: { readonly get: (name: string) => string | null };
}): ReturnPath => {
  const candidate = url.searchParams.get("returnTo");
  return candidate !== null && Schema.is(ReturnPath)(candidate)
    ? candidate
    : ReturnPath.make("/workspaces");
};
