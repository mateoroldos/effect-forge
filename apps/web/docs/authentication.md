# Authentication and organization access

For protected operations, session changes, or organization routes.

- Call `AuthGuard.requireIdentity` in every protected operation, not just layouts.
  Use `AuthGuard.reject`; provider outages are availability errors, not sign-out.
- Layouts expose `{ viewer }`. Invalidate user-dependent queries after auth changes.
  Do not add a session lookup after a remote redirect.
- The [organization layout](../src/routes/%28authenticated%29/org/%5BorganizationSlug%5D/+layout.ts)
  resolves slugs and returns a uniform `404` for missing/inaccessible organizations.
  Children use `data.organization` and its stable ID; key local UI by that ID.
- Never use the provider's active organization to authorize a URL. Core checks
  each permission, including submissions from forms mounted before access was revoked.
  Browser permission checks only control presentation.
- Slugs are mutable addresses, not IDs. [Provider hooks](../src/lib/server/better-auth-options.ts)
  validate them. Renaming an organization does not change its slug; old slugs may
  be reused without redirects.

The [request runtime](runtime.md#lifetime-and-identity) owns identity/membership caching.
[Frontend recovery](frontend.md#error-channels-and-recovery) owns public failure behavior.

## Verify

Use [auth integration tests](../src/lib/server/authentication.test.ts). In the browser,
check anonymous/expired sessions, revoked access on a mounted form, provider outage,
and missing/inaccessible slugs. Report any unverified cases.
