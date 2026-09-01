import { EmailAddress } from "@effect-forge/domain/email-address";
import { UserName } from "@effect-forge/domain/identity";
import { Effect, Schema } from "effect";
import { Atom } from "effect/unstable/reactivity";
import { authClient } from "./auth-client.ts";

/** Better Auth's default minimum. A shorter password is refused when creating an account. */
const minimumPasswordLength = 8;

/** What signing in presents. Any password is worth sending; only the provider can judge it. */
export const Credentials = Schema.Struct({
  email: EmailAddress,
  password: Schema.NonEmptyString,
});
export interface Credentials extends Schema.Schema.Type<typeof Credentials> {}

/** What creating an account establishes, checked before the provider sees it. */
export const Registration = Schema.Struct({
  name: UserName,
  email: EmailAddress,
  password: Schema.String.pipe(Schema.check(Schema.isMinLength(minimumPasswordLength))),
});
export interface Registration extends Schema.Schema.Type<typeof Registration> {}

export class CredentialsRejected extends Schema.TaggedError<CredentialsRejected>()(
  "Auth.CredentialsRejected",
  { message: Schema.String },
) {}

export class RegistrationRejected extends Schema.TaggedError<RegistrationRejected>()(
  "Auth.RegistrationRejected",
  { message: Schema.String },
) {}

export class SignOutRejected extends Schema.TaggedError<SignOutRejected>()("Auth.SignOutRejected", {
  message: Schema.String,
}) {}

export class ProviderUnreachable extends Schema.TaggedError<ProviderUnreachable>()(
  "Auth.ProviderUnreachable",
  { cause: Schema.Defect() },
) {}

interface ProviderResponse {
  readonly error: { readonly message?: string | undefined } | null;
}

const callProvider = (call: () => Promise<ProviderResponse>) =>
  Effect.tryPromise({
    try: call,
    catch: (cause) => new ProviderUnreachable({ cause }),
  });

export const signIn = Atom.fn<Credentials>()((credentials) =>
  Effect.gen(function* () {
    const { error } = yield* callProvider(() => authClient.signIn.email(credentials));
    if (error !== null) {
      return yield* new CredentialsRejected({ message: error.message ?? "Please try again." });
    }
  }),
);

export const signUp = Atom.fn<Registration>()((registration) =>
  Effect.gen(function* () {
    const { error } = yield* callProvider(() => authClient.signUp.email(registration));
    if (error !== null) {
      return yield* new RegistrationRejected({ message: error.message ?? "Please try again." });
    }
  }),
);

export const signOut = Atom.fn<void>()(() =>
  Effect.gen(function* () {
    const { error } = yield* callProvider(() => authClient.signOut());
    if (error !== null) {
      return yield* new SignOutRejected({ message: error.message ?? "Please try again." });
    }
  }),
);
