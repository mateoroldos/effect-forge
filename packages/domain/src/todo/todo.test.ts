import { assert, describe, it } from "@effect/vitest";
import { Schema } from "effect";
import { TodoTitle } from "./todo.ts";

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
