import { assert, describe, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { EmailAddress } from "./email-address.ts";

const decodeEmailAddress = Schema.decodeUnknownEffect(EmailAddress);

describe("EmailAddress", () => {
  it.effect("accepts syntactically valid addresses", () =>
    Effect.gen(function* () {
      for (const input of ["a@b.co", "user.name+tag@example.com"]) {
        const result = yield* decodeEmailAddress(input);
        assert.strictEqual(result, input);
      }
    }),
  );

  it.effect("rejects malformed and non-string input", () =>
    Effect.gen(function* () {
      for (const input of ["", "no-at", "a@b", "two@@b.co", "spa ce@b.co", 42]) {
        const result = yield* Effect.result(decodeEmailAddress(input));
        assert.isTrue(Result.isFailure(result));
      }
    }),
  );
});
