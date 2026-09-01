import { Principal } from "@effect-forge/domain/identity";
import { Effect, Layer, Ref } from "effect";
import { IdentityStore } from "./identity-store.ts";
import type { ProviderIdentity } from "./provider-account.ts";

interface Entry {
  readonly identity: ProviderIdentity;
  readonly principal: Principal;
}

const sameIdentity = (left: ProviderIdentity, right: ProviderIdentity) =>
  left.provider === right.provider && left.subject === right.subject;

/** Provides atomic in-memory application identity persistence for tests. */
export const layer = Layer.effect(
  IdentityStore.Service,
  Effect.gen(function* () {
    const state = yield* Ref.make<ReadonlyArray<Entry>>([]);

    return IdentityStore.Service.of({
      resolveOrCreate: (account, candidateUserId) =>
        Ref.modify(
          state,
          (
            entries,
          ): readonly [
            Effect.Effect<Principal, IdentityStore.EmailTaken>,
            ReadonlyArray<Entry>,
          ] => {
            const linked = entries.find((entry) => sameIdentity(entry.identity, account.identity));
            if (linked !== undefined) {
              return [Effect.succeed(linked.principal), entries] as const;
            }

            const emailTaken = entries.some((entry) => entry.principal.email === account.email);
            if (emailTaken) {
              return [Effect.fail(new IdentityStore.EmailTaken()), entries] as const;
            }

            const principal = Principal.make({
              userId: candidateUserId,
              email: account.email,
              name: account.name,
            });
            return [
              Effect.succeed(principal),
              [...entries, { identity: account.identity, principal }],
            ];
          },
        ).pipe(Effect.flatten),
    });
  }),
);

export * as IdentityStoreMemory from "./identity-store-memory.ts";
