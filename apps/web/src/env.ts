import { defineEnvVars } from "@sveltejs/kit/env";

/** Scalar configuration supplied to the SvelteKit application at runtime. */
export const variables = defineEnvVars({
  SEARCH_INDEXABLE: {
    description: "Whether search engines may index the deployed web application",
    public: true,
    schema: (value) => value === "true",
  },
});
