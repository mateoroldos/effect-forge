import { createAuthClient } from "better-auth/svelte";
import { organizationClient } from "better-auth/client/plugins";

/** Better Auth's shared browser session and protocol client. */
export const authClient = createAuthClient({ plugins: [organizationClient()] });
