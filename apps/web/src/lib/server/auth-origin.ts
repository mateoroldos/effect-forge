import { Schema } from "effect";

const AuthOrigin = Schema.URLFromString.check(
  Schema.makeFilter((url) =>
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.username === "" &&
    url.password === "" &&
    url.pathname === "/" &&
    url.search === "" &&
    url.hash === ""
      ? undefined
      : "AUTH_ORIGIN must be an HTTP(S) origin",
  ),
);
const decodeAuthOriginValue = Schema.decodeUnknownSync(AuthOrigin);

export const decodeAuthOrigin = (input: string): URL => {
  try {
    return decodeAuthOriginValue(input);
  } catch {
    throw new Error("SvelteKit authentication origin is invalid");
  }
};
