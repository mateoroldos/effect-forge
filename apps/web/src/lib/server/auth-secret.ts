import { Schema } from "effect";

const AuthSecret = Schema.RedactedFromValue(Schema.String.check(Schema.isMinLength(32)), {
  label: "AUTH_SECRET",
  disallowEncode: true,
});
const decodeAuthSecretValue = Schema.decodeUnknownSync(AuthSecret);

export const decodeAuthSecret = (authSecret: string) => {
  try {
    return decodeAuthSecretValue(authSecret);
  } catch {
    throw new Error("SvelteKit authentication secret is invalid");
  }
};
