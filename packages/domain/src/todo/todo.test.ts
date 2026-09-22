import { assert, describe, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { TodoDescription, TodoTitle } from "./todo.ts";

describe("TodoTitle", () => {
  it("requires a nonblank, trimmed title within the storage limit", () => {
    const valid = Schema.is(TodoTitle);
    assert.isTrue(valid("Ship organizations"));
    assert.isTrue(valid("x".repeat(200)));
    for (const title of ["", " ", " title", "title ", "x".repeat(201)]) {
      assert.isFalse(valid(title));
    }
  });
});

const decodeDescription = Schema.decodeUnknownEffect(TodoDescription);

describe("TodoDescription", () => {
  it.effect("allows empty text and preserves multiline descriptions up to the limit", () =>
    Effect.gen(function* () {
      for (const input of ["", "First line\n  Second line", "a".repeat(2000)]) {
        assert.strictEqual(yield* decodeDescription(input), input);
      }
    }),
  );

  it.effect("rejects overlong and non-string descriptions", () =>
    Effect.gen(function* () {
      for (const input of ["a".repeat(2001), null, 42]) {
        assert.isTrue(Result.isFailure(yield* Effect.result(decodeDescription(input))));
      }
    }),
  );
});
