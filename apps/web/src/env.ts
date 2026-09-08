import { defineEnvVars } from "@sveltejs/kit/env";

/** Scalar configuration supplied to the SvelteKit application at runtime. */
export const variables = defineEnvVars({
  SEARCH_INDEXABLE: {
    public: true,
    schema: (value) => value === "true",
  },
});
