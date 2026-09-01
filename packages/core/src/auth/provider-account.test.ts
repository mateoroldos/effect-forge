import { assert, describe, it } from "@effect/vitest";
import { Effect, Result, Schema } from "effect";
import { ProviderAccount } from "./provider-account.ts";

const decodeAccount = Schema.decodeUnknownEffect(ProviderAccount);

describe("ProviderAccount", () => {
  it.effect("parses provider-neutral identity and profile claims", () =>
    Effect.gen(function* () {
      const account = yield* decodeAccount({
        identity: { source: "primary", subject: "provider-user-1" },
        email: "ada@example.com",
        name: "Ada Lovelace",
      });

      assert.strictEqual(account.identity.source, "primary");
      assert.strictEqual(account.identity.subject, "provider-user-1");
    }),
  );

  it.effect("rejects empty identity parts", () =>
    Effect.gen(function* () {
      for (const identity of [
        { source: "", subject: "provider-user-1" },
        { source: "primary", subject: "" },
      ]) {
        const result = yield* Effect.result(
          decodeAccount({ identity, email: "ada@example.com", name: "Ada Lovelace" }),
        );
        assert.isTrue(Result.isFailure(result));
      }
    }),
  );
});
