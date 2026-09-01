import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { ReturnPath } from "./destination.ts";

const isReturnPath = Schema.is(ReturnPath);

describe("ReturnPath", () => {
  it.each(["/workspaces", "/workspaces?tab=recent", "/workspaces#recent"])(
    "accepts the same-document path %s",
    (path) => expect(isReturnPath(path)).toBe(true),
  );

  it.each(["//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)"])(
    "rejects the external destination %s",
    (path) => expect(isReturnPath(path)).toBe(false),
  );
});
