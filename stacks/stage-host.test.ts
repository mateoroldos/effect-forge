import { describe, expect, it } from "vitest";
import { stageHostFor } from "./stage-host.ts";

describe("stageHostFor", () => {
  it.each([
    ["prod", "app.effect-forge.com"],
    ["staging", "staging.effect-forge.com"],
    ["pr-123", "pr-123.effect-forge.com"],
  ])("maps %s to one application host", (stage, hostname) => {
    expect(stageHostFor(stage)).toEqual({ hostname, origin: `https://${hostname}` });
  });

  it("leaves local development unmanaged", () => {
    expect(stageHostFor("dev_alice")).toBeNull();
  });
});
