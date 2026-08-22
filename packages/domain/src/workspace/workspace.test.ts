import { assert, describe, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { WorkspaceId, WorkspaceName } from "./workspace.ts";

const decodeWorkspaceId = Schema.decodeUnknownEffect(WorkspaceId);
const decodeWorkspaceName = Schema.decodeUnknownEffect(WorkspaceName);

describe("Workspace", () => {
  it.effect("accepts workspace values", () =>
    Effect.gen(function* () {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const name = "Effect Forge";

      assert.strictEqual(yield* decodeWorkspaceId(id), id);
      assert.strictEqual(yield* decodeWorkspaceName(name), name);
    }),
  );

  it.effect("rejects invalid workspace values", () =>
    Effect.gen(function* () {
      for (const input of ["", "not-a-uuid", "550e8400-e29b-11d4-a716-446655440000", 42]) {
        assert.isTrue(Result.isFailure(yield* Effect.result(decodeWorkspaceId(input))));
      }

      for (const input of ["", " untrimmed", "untrimmed ", "a".repeat(101), 42]) {
        assert.isTrue(Result.isFailure(yield* Effect.result(decodeWorkspaceName(input))));
      }
    }),
  );
});
