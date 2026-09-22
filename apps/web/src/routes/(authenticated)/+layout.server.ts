import { Result } from "effect";
import { AuthGuard } from "#lib/server/auth-guard.ts";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ locals, url }) =>
  locals.run("Load.authenticatedLayout", AuthGuard.requireIdentity).then(
    Result.match({
      onSuccess: ({ viewer }) => ({ viewer }),
      onFailure: (failure) => AuthGuard.reject(failure, `${url.pathname}${url.search}`),
    }),
  );
