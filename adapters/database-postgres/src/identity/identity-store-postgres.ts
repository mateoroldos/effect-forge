import { IdentityStore } from "@effect-forge/core/identity-store";
import { ProviderAccount } from "@effect-forge/core/provider-account";
import { Principal, UserId } from "@effect-forge/domain/identity";
import { and, eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect";
import { Database } from "../internal/database.ts";
import { identityLinks, users } from "./schema.ts";

const decodePrincipal = Schema.decodeUnknownEffect(Principal);

/** Provides PostgreSQL-backed application identity resolution and provisioning. */
export const layer = Layer.effect(
  IdentityStore.Service,
  Effect.gen(function* () {
    const database = yield* Database.Service;

    const resolveOrCreate = Effect.fn("IdentityStorePostgres.resolveOrCreate")(
      (account: ProviderAccount, candidateUserId: UserId) =>
        database
          .transaction((transaction) =>
            Effect.gen(function* () {
              const [linked] = yield* transaction
                .select({ userId: users.id, email: users.email, name: users.name })
                .from(identityLinks)
                .innerJoin(users, eq(identityLinks.userId, users.id))
                .where(
                  and(
                    eq(identityLinks.identitySource, account.identity.source),
                    eq(identityLinks.externalSubject, account.identity.subject),
                  ),
                )
                .limit(1);
              if (linked !== undefined) return yield* decodePrincipal(linked);

              const inserted = yield* transaction
                .insert(users)
                .values({ id: candidateUserId, email: account.email, name: account.name })
                .onConflictDoNothing({ target: users.email })
                .returning({ userId: users.id });
              if (inserted.length === 0) {
                const [concurrentLink] = yield* transaction
                  .select({ userId: users.id, email: users.email, name: users.name })
                  .from(identityLinks)
                  .innerJoin(users, eq(identityLinks.userId, users.id))
                  .where(
                    and(
                      eq(identityLinks.identitySource, account.identity.source),
                      eq(identityLinks.externalSubject, account.identity.subject),
                    ),
                  )
                  .limit(1);
                if (concurrentLink !== undefined) return yield* decodePrincipal(concurrentLink);

                return yield* new IdentityStore.AccountConflict();
              }

              yield* transaction.insert(identityLinks).values({
                identitySource: account.identity.source,
                externalSubject: account.identity.subject,
                userId: candidateUserId,
              });

              return Principal.make({
                userId: candidateUserId,
                email: account.email,
                name: account.name,
              });
            }),
          )
          .pipe(
            Effect.mapError((cause) =>
              Schema.is(IdentityStore.AccountConflict)(cause)
                ? cause
                : new IdentityStore.PersistenceError({ cause }),
            ),
          ),
    );

    return IdentityStore.Service.of({ resolveOrCreate });
  }),
);

export * as IdentityStorePostgres from "./identity-store-postgres.ts";
