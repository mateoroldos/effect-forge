import { Schema } from "effect";

/** Public API origin supplied by the Alchemy stack at build time. */
export const apiBaseUrl = Schema.decodeUnknownSync(Schema.URLFromString)(
  import.meta.env.VITE_API_URL,
);

/** Whether this stage may appear in search results. Absent means no, which suits every copy. */
export const searchIndexable = import.meta.env.VITE_SEARCH_INDEXABLE === "true";
