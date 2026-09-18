import { afterEach, describe, expect, it, vi } from "vitest";
import { Cause } from "effect";
import { handleError } from "./hooks.server.ts";

afterEach(() => vi.restoreAllMocks());

describe("handleError", () => {
  it("keeps pure request cancellation out of unexpected-error diagnostics", () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("cancelled", { cause: Cause.interrupt() });
    const request = new Request("https://example.com/organizations", {
      signal: AbortSignal.abort(),
    });
    expect(handleError({ kind: "unknown", error, event: { request } })).toEqual({
      message: "Something went wrong. Refresh before trying again.",
    });
    expect(report).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: "defect during cancellation",
      cause: Cause.combine(Cause.interrupt(), Cause.die(new Error("private defect"))),
    },
    {
      name: "unknown failure during cancellation",
      cause: new Error("private error"),
    },
  ])("reports $name without exposing diagnostics", ({ cause }) => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("private operation detail", { cause });
    const request = new Request("https://example.com/organizations", {
      signal: AbortSignal.abort(),
    });
    expect(handleError({ kind: "unknown", error, event: { request } })).toEqual({
      message: "Something went wrong. Refresh before trying again.",
    });
    expect(report).toHaveBeenCalledExactlyOnceWith(error);
  });

  it("leaves deliberate application errors to SvelteKit", () => {
    const report = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = new Request("https://example.com/organizations");
    expect(
      handleError({
        kind: "app",
        error: { status: 403, message: "Access denied" },
        event: { request },
      }),
    ).toBeUndefined();
    expect(report).not.toHaveBeenCalled();
  });
});
