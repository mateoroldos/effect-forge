import { Crypto, Effect, Layer, PlatformError } from "effect";

const make = () => {
  let sequence = 0;
  return Crypto.make({
    randomBytes: (size) => {
      const bytes = new Uint8Array(size);
      bytes[size - 1] = sequence++;
      return bytes;
    },
    digest: (_algorithm, data) => Effect.succeed(data),
  });
};

/** Provides deterministic, distinct cryptographic values for tests. */
export const layer = Layer.sync(Crypto.Crypto, make);

/** Provides deterministic Crypto behavior whose UUID generation fails. */
export const randomUUIDFailureLayer = (error: PlatformError.PlatformError) =>
  Layer.effect(
    Crypto.Crypto,
    Effect.gen(function* () {
      const crypto = yield* Crypto.Crypto;
      return Crypto.Crypto.of({ ...crypto, randomUUIDv4: Effect.fail(error) });
    }),
  ).pipe(Layer.provide(layer));

export * as CryptoDeterministic from "./crypto-deterministic.ts";
