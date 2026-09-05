import { assert, describe, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { UserId } from "./identity.ts";

const decodeUserId = Schema.decodeUnknownEffect(UserId);
describe("UserId", () => {
  it.effect("accepts an opaque Better Auth identifier", () =>
    Effect.gen(function* () {
      const id = "JqF4yN8rT6vW1zX3cB7mK9pL";
      assert.strictEqual(yield* decodeUserId(id), id);
    }),
  );

  it.effect("rejects empty, untrimmed, oversized, and non-string values", () =>
    Effect.gen(function* () {
      for (const input of ["", " untrimmed", "a".repeat(256), 42]) {
        assert.isTrue(Result.isFailure(yield* Effect.result(decodeUserId(input))));
      }
    }),
  );
});
