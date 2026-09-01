import { assert, describe, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { UserId, UserName } from "./identity.ts";

const decodeUserId = Schema.decodeUnknownEffect(UserId);
const decodeUserName = Schema.decodeUnknownEffect(UserName);

describe("UserId", () => {
  it.effect("accepts a version 4 UUID", () =>
    Effect.gen(function* () {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      assert.strictEqual(yield* decodeUserId(id), id);
    }),
  );

  it.effect("rejects other values", () =>
    Effect.gen(function* () {
      for (const input of ["", "not-a-uuid", 42]) {
        assert.isTrue(Result.isFailure(yield* Effect.result(decodeUserId(input))));
      }
    }),
  );
});

describe("UserName", () => {
  it.effect("accepts a trimmed name", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* decodeUserName("Ada Lovelace"), "Ada Lovelace");
    }),
  );

  it.effect("rejects empty, untrimmed, and long names", () =>
    Effect.gen(function* () {
      for (const input of ["", " untrimmed", "a".repeat(101), 42]) {
        assert.isTrue(Result.isFailure(yield* Effect.result(decodeUserName(input))));
      }
    }),
  );
});
