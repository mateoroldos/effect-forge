import { describe, expect, it } from "vitest";
import { decodeAuthOrigin } from "./auth-origin.ts";

describe("decodeAuthOrigin", () => {
  it.each([
    "http://localhost:5173",
    "https://app.effect-forge.com",
    "https://effect-forge-web.example.workers.dev",
  ])("accepts the HTTP(S) origin %s", (input) => {
    expect(decodeAuthOrigin(input).origin).toBe(input);
  });

  it.each([
    "ftp://app.effect-forge.com",
    "https://user:password@app.effect-forge.com",
    "https://app.effect-forge.com/path",
    "https://app.effect-forge.com?query=true",
    "not a URL",
  ])("rejects the non-origin value %s", (input) => {
    expect(() => decodeAuthOrigin(input)).toThrow("SvelteKit authentication origin is invalid");
  });
});
