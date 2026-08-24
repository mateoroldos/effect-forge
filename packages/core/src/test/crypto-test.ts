import { Crypto, Effect, Layer } from "effect";

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

export * as CryptoTest from "./crypto-test.ts";
