import { Principal, UserId } from "@effect-forge/domain/identity";
import { Context, Crypto, Effect, Layer, Schema } from "effect";
import { IdentityStore } from "./identity-store.ts";
import type { ProviderAccount } from "./provider-account.ts";

const decodeUserId = Schema.decodeSync(UserId);

/** Application identity provisioning capability. */
export interface Interface {
  readonly resolve: (
    account: ProviderAccount,
  ) => Effect.Effect<
    Principal,
    IdGenerationError | IdentityStore.EmailTaken | IdentityStore.PersistenceError
  >;
}

/** Maps provider-authenticated accounts to application-owned principals. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/IdentityDirectory",
) {}

/** Indicates that secure user identifier generation failed. */
export class IdGenerationError extends Schema.TaggedError<IdGenerationError>()(
  "IdentityDirectory.IdGenerationError",
  { cause: Schema.Defect() },
) {}

const make = Effect.gen(function* () {
  const crypto = yield* Crypto.Crypto;
  const identities = yield* IdentityStore.Service;

  const resolve = Effect.fn("IdentityDirectory.resolve")(function* (account: ProviderAccount) {
    const rawId = yield* crypto.randomUUIDv4.pipe(
      Effect.mapError((cause) => new IdGenerationError({ cause })),
    );
    const candidateUserId = decodeUserId(rawId);
    return yield* identities.resolveOrCreate(account, candidateUserId);
  });

  return Service.of({ resolve });
});

/** Builds `IdentityDirectory` while leaving identity persistence and cryptography open. */
export const layer = Layer.effect(Service, make);

export * as IdentityDirectory from "./identity-directory.ts";
