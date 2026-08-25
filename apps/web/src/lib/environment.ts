import { Schema } from "effect";

/** Public API origin supplied by the Alchemy stack at build time. */
export const apiBaseUrl = Schema.decodeUnknownSync(Schema.URLFromString)(
  import.meta.env.VITE_API_URL,
);
