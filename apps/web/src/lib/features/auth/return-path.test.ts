import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { fromURL, ReturnPath } from "./return-path.ts";

const isReturnPath = Schema.is(ReturnPath);

describe("ReturnPath", () => {
  it.each(["/", "/org/my-org/todos", "/org/my-org/todos?tab=open", "/#recent"])(
    "accepts the same-document path %s",
    (path) => expect(isReturnPath(path)).toBe(true),
  );

  it.each([
    "//evil.example",
    "/\\evil.example",
    "https://evil.example",
    "javascript:alert(1)",
    "/\t/evil.example",
    "/\n/evil.example",
    "/\r/evil.example",
    "/org/my-org\u0000",
  ])("rejects the external destination %s", (path) => expect(isReturnPath(path)).toBe(false));

  it("reads a safe return path and rejects an external one", () => {
    expect(fromURL(new URL("https://app.example/sign-in?returnTo=%2Forg%2Fmy-org%2Ftodos"))).toBe(
      "/org/my-org/todos",
    );
    expect(
      fromURL(new URL("https://app.example/sign-in?returnTo=https%3A%2F%2Fevil.example")),
    ).toBe("/");
  });
});
