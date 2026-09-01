import { assert, describe, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { WorkspaceMember, WorkspaceRole } from "./workspace-member.ts";

const decodeRole = Schema.decodeUnknownEffect(WorkspaceRole);
const decodeMember = Schema.decodeUnknownEffect(WorkspaceMember);

describe("WorkspaceRole", () => {
  it.effect("accepts the built-in roles", () =>
    Effect.gen(function* () {
      for (const role of ["owner", "admin", "member"] as const) {
        assert.strictEqual(yield* decodeRole(role), role);
      }
    }),
  );

  it.effect("rejects unknown roles", () =>
    Effect.gen(function* () {
      for (const input of ["guest", "", 42]) {
        assert.isTrue(Result.isFailure(yield* Effect.result(decodeRole(input))));
      }
    }),
  );
});

describe("WorkspaceMember", () => {
  it.effect("parses a membership", () =>
    Effect.gen(function* () {
      const member = yield* decodeMember({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
        role: "member",
      });

      assert.strictEqual(member.role, "member");
    }),
  );
});
