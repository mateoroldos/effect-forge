import { EmailAddress } from "@effect-forge/domain/email-address";
import { UserName } from "@effect-forge/domain/identity";
import { Schema } from "effect";

/** An application-configured source of external identities. */
export const IdentitySourceId = Schema.NonEmptyString.pipe(Schema.brand("IdentitySourceId"));

/** An application-configured source of external identities. */
export type IdentitySourceId = typeof IdentitySourceId.Type;

/** A subject identifier issued by an external identity source. */
export const ExternalSubject = Schema.NonEmptyString.pipe(Schema.brand("ExternalSubject"));

/** A subject identifier issued by an external identity source. */
export type ExternalSubject = typeof ExternalSubject.Type;

/** The stable external identity attached to a provider account. */
export const ExternalIdentity = Schema.Struct({
  source: IdentitySourceId,
  subject: ExternalSubject,
});

/** The stable external identity attached to a provider account. */
export interface ExternalIdentity extends Schema.Schema.Type<typeof ExternalIdentity> {}

/** Parsed account claims from an authenticated provider session. */
export const ProviderAccount = Schema.Struct({
  identity: ExternalIdentity,
  email: EmailAddress,
  name: UserName,
});

/** Parsed account claims from an authenticated provider session. */
export interface ProviderAccount extends Schema.Schema.Type<typeof ProviderAccount> {}

export * as ProviderAccounts from "./provider-account.ts";
