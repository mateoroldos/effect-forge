import { Principal, UserId } from "@effect-forge/domain/identity";
import { Context, Effect, Schema } from "effect";
import { ProviderAccount } from "./provider-account.ts";

/** Persistence required to map provider accounts to application principals. */
export interface Interface {
  readonly resolveOrCreate: (
    account: ProviderAccount,
    candidateUserId: UserId,
  ) => Effect.Effect<Principal, EmailTaken | PersistenceError>;
}

/** Maps provider accounts to application principals atomically. */
export class Service extends Context.Service<Service, Interface>()(
  "@effect-forge/core/IdentityStore",
) {}

/** Indicates that the account email already belongs to a different provider identity. */
export class EmailTaken extends Schema.TaggedError<EmailTaken>()("IdentityStore.EmailTaken", {}) {}

/** Indicates that application identity persistence is unavailable. */
export class PersistenceError extends Schema.TaggedError<PersistenceError>()(
  "IdentityStore.PersistenceError",
  { cause: Schema.Defect() },
) {}

export * as IdentityStore from "./identity-store.ts";
