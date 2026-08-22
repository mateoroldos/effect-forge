# Frontend

## Ownership

| Tool            | Responsibility                                                            |
| --------------- | ------------------------------------------------------------------------- |
| TanStack Start  | SSR, streaming, web runtime, deployment entry                             |
| TanStack Router | routes, search parameters, navigation, loaders                            |
| Effect Atom     | remote state, Effects, caching, invalidation, optimistic updates, streams |
| TanStack Form   | form drafts, field interaction, client validation                         |
| Effect Schema   | canonical input validation                                                |
| React state     | component-local presentation state                                        |

Do not add TanStack Query alongside Effect Atom.

## API client

Use the official React binding and construct one typed client service:

```ts
export class AppApiClient extends AtomHttpApi.Service<AppApiClient>()(
  "@effect-forge/web/AppApiClient",
  {
    api: AppApi,
    httpClient: FetchHttpClient.layer,
    baseUrl,
  },
) {}
```

Queries return atoms of `AsyncResult`. Mutations return writable result functions. Use reactivity keys to refresh dependent queries after successful mutations and an idle TTL only when data should survive unmount.

Use `AtomRpc.Service` instead when an operation belongs to the private RPC tier.

## SSR and hydration

```text
request
  → new AtomRegistry
  → route loader fetches required data
  → seed serializable atoms
  → render and serialize hydration state
  → browser registry hydrates once
```

Never reuse an authenticated registry across server requests. Keep browser-only atoms away from SSR or provide an explicit server value.

## Optimistic mutation

Effect Atom provides `Atom.optimistic` and `Atom.optimisticFn`.

```text
form submits input
  → reducer applies provisional value
  → typed mutation runs
     ├─ success → invalidate and refresh authoritative query
     └─ failure → roll back to the latest source value
```

Use stable temporary identities so list rendering and reconciliation do not duplicate an item. Keep conflict or version policy on the server; optimistic UI is presentation, not authority.

## Forms

Pass the owned RPC or `HttpApi` input schema to TanStack Form through Standard Schema. TanStack Form validates schema input but does not return transformed schema output from `onSubmit`; decode again before invoking the mutation.

Map typed application failures to form or field errors at the feature boundary. Transport failures remain page-level or toast-level failures unless a field can truthfully correct them.

## Server functions

TanStack Start server functions are same-origin RPC endpoints. Do not place application policy or database access in them and do not use them as a mandatory BFF. They may bootstrap SSR data or perform work that requires credentials owned by the web server.
