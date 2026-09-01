import { EmailAddress } from "@effect-forge/domain/email-address";
import { UserName } from "@effect-forge/domain/identity";
import { Schema } from "effect";

/** An application-configured external identity provider. */
export const ProviderId = Schema.NonEmptyString.pipe(Schema.brand("ProviderId"));

/** An application-configured external identity provider. */
export type ProviderId = typeof ProviderId.Type;

const ProviderSubject = Schema.NonEmptyString.pipe(Schema.brand("ProviderSubject"));

/** The stable external identity a provider assigns to one account. */
export const ProviderIdentity = Schema.Struct({
  provider: ProviderId,
  subject: ProviderSubject,
});

/** The stable external identity a provider assigns to one account. */
export interface ProviderIdentity extends Schema.Schema.Type<typeof ProviderIdentity> {}

/** Parsed account claims from an authenticated provider session. */
export const ProviderAccount = Schema.Struct({
  identity: ProviderIdentity,
  email: EmailAddress,
  name: UserName,
});

/** Parsed account claims from an authenticated provider session. */
export interface ProviderAccount extends Schema.Schema.Type<typeof ProviderAccount> {}
