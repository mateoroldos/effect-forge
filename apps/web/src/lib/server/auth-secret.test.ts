import { Redacted } from "effect";
import { describe, expect, it } from "vitest";
import { decodeAuthSecret } from "./auth-secret.ts";

describe("decodeAuthSecret", () => {
  it("redacts a sufficiently long secret", () => {
    expect(Redacted.isRedacted(decodeAuthSecret("a".repeat(32)))).toBe(true);
  });

  it.each(["", "a".repeat(31)])("rejects the invalid secret %s", (input) => {
    expect(() => decodeAuthSecret(input)).toThrow("SvelteKit authentication secret is invalid");
  });

  it("does not expose invalid input in the failure", () => {
    expect.assertions(1);
    const invalid = "must-not-leak";

    try {
      decodeAuthSecret(invalid);
    } catch (error) {
      expect(String(error)).toBe("Error: SvelteKit authentication secret is invalid");
    }
  });
});
