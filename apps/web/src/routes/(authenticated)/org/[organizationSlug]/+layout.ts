import { error } from "@sveltejs/kit";
import { listOrganizations } from "#lib/features/organizations/organizations.remote.ts";
import type { LayoutLoad } from "./$types";

// oxlint-disable-next-line effecttsgo/async-function -- SvelteKit owns this universal load Promise boundary.
export const load = (async ({ params }) => {
  const organizations = await listOrganizations();
  const organization = organizations.find(
    (organization) => organization.slug === params.organizationSlug,
  );
  if (organization === undefined) error(404, "Organization not found.");

  return { organization };
}) satisfies LayoutLoad;
