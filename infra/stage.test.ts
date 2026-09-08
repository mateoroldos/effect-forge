import { describe, expect, it } from "vitest";
import { stageHostFor, stageHostsFor } from "./stage.ts";

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

describe("stageHostsFor", () => {
  it.each([
    ["prod", "app.effect-forge.com", "api.effect-forge.com"],
    ["staging", "staging.effect-forge.com", "api.staging.effect-forge.com"],
    ["pr-123", "pr-123.effect-forge.com", "api.pr-123.effect-forge.com"],
  ])("models the target %s web and API hosts", (stage, web, api) => {
    expect(stageHostsFor(stage)).toEqual({
      web: { hostname: web, origin: `https://${web}` },
      api: { hostname: api, origin: `https://${api}` },
    });
  });

  it("leaves both local development hosts unmanaged", () => {
    expect(stageHostsFor("dev_alice")).toEqual({ web: null, api: null });
  });
});
