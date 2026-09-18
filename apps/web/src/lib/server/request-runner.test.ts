/* oxlint-disable effecttsgo/async-function -- Tests exercise the runner's public Promise boundary. */
import { assert, describe, expect, it, onTestFinished } from "vitest";
import { Cause, Deferred, Effect, Layer, Logger, ManagedRuntime, Result } from "effect";
import { RequestRunner } from "./request-runner.ts";

const fixture = <E = never>(layer: Layer.Layer<never, E> = Layer.empty) => {
  const entries: Array<ReturnType<typeof Logger.formatStructured.log>> = [];
  const runtime = ManagedRuntime.make(
    Layer.mergeAll(
      layer,
      Logger.layer([
        Logger.make((options) => {
          entries.push(Logger.formatStructured.log(options));
        }),
      ]),
    ),
  );
  onTestFinished(() => runtime.dispose());
  const controller = new AbortController();
  return { entries, controller, run: RequestRunner.make(runtime, controller.signal) };
};

describe("RequestRunner", () => {
  it("returns values and typed failures with correlated, payload-free summaries", async () => {
    const { run, entries } = fixture();
    const value = { title: "Read the engine notes" };
    const failure = { _tag: "Test.Denied", cause: { message: "password=secret SQL private" } };
    const success = await run("Test.success", Effect.succeed(value));
    const rejected = await run("Test.denied", Effect.fail(failure));
    assert(Result.isSuccess(success));
    assert.strictEqual(success.success, value);
    assert(Result.isFailure(rejected));
    assert.strictEqual(rejected.failure, failure);
    expect(entries).toMatchObject([
      {
        level: "INFO",
        annotations: {
          operation: "Test.success",
          outcome: "success",
          trace_id: expect.any(String),
          span_id: expect.any(String),
          duration_ms: expect.any(Number),
        },
      },
      {
        level: "ERROR",
        annotations: {
          operation: "Test.denied",
          outcome: "failure",
          "error.type": "Test.Denied",
          "error.kind": "typed",
        },
      },
    ]);
    expect(JSON.stringify(entries)).not.toContain("password=secret");
    expect(JSON.stringify(entries)).not.toContain("SQL private");
  });

  it("does not acquire services or enter an operation for an already-aborted request", async () => {
    let acquired = false;
    let entered = false;
    const { run, controller, entries } = fixture(
      Layer.effectDiscard(
        Effect.sync(() => {
          acquired = true;
        }),
      ),
    );
    controller.abort();
    await expect(
      run(
        "Test.preAborted",
        Effect.sync(() => {
          entered = true;
        }),
      ),
    ).rejects.toMatchObject({ cause: { reasons: [{ _tag: "Interrupt" }] } });
    expect(acquired).toBe(false);
    expect(entered).toBe(false);
    expect(entries).toHaveLength(0);
  });

  const failure = { _tag: "Test.Denied" };
  const unavailable = { _tag: "Test.Unavailable" };
  it.each([
    {
      name: "multiple typed failures",
      cause: Cause.combine(Cause.fail(failure), Cause.fail(unavailable)),
      reasons: [
        { _tag: "Fail", error: failure },
        { _tag: "Fail", error: unavailable },
      ],
    },
    {
      name: "typed failure with interruption",
      cause: Cause.combine(Cause.fail(failure), Cause.interrupt()),
      reasons: [{ _tag: "Fail", error: failure }, { _tag: "Interrupt" }],
    },
  ])("rejects $name with all cause reasons", async ({ cause, reasons }) => {
    const { run } = fixture();
    await expect(run("Test.failure", Effect.failCause(cause))).rejects.toMatchObject({
      cause: { reasons },
    });
  });

  it("retains and reports a cleanup defect alongside the operation's typed failure", async () => {
    const { run, entries } = fixture();
    const defect = new Error("private cleanup defect");
    await expect(
      run("Test.cleanup", Effect.fail(failure).pipe(Effect.ensuring(Effect.die(defect)))),
    ).rejects.toMatchObject({
      cause: {
        reasons: [
          { _tag: "Fail", error: failure },
          { _tag: "Die", defect },
        ],
      },
    });
    expect(entries).toMatchObject([
      { level: "ERROR", annotations: { outcome: "failure", "error.kind": "defect" } },
    ]);
    expect(JSON.stringify(entries)).not.toContain("private cleanup defect");
  });

  it("propagates cancellation after cleanup and emits one cancellation summary", async () => {
    const { run, controller, entries } = fixture();
    const started = Deferred.makeUnsafe<void>();
    let finalized = false;
    const pending = run(
      "Test.cancel",
      Effect.gen(function* () {
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            finalized = true;
          }),
        );
        yield* Deferred.succeed(started, undefined);
        return yield* Effect.never;
      }).pipe(Effect.scoped),
    );
    await Effect.runPromise(Deferred.await(started));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ cause: { reasons: [{ _tag: "Interrupt" }] } });
    expect(finalized).toBe(true);
    expect(entries).toMatchObject([
      { level: "INFO", annotations: { outcome: "cancelled", "error.kind": "interruption" } },
    ]);
  });

  it("rejects runtime acquisition failures instead of returning an operation Result", async () => {
    const failure = { _tag: "Test.AcquisitionFailed" };
    let entered = false;
    const { run, entries } = fixture(Layer.effectDiscard(Effect.fail(failure)));
    await expect(
      run(
        "Test.unentered",
        Effect.sync(() => {
          entered = true;
        }),
      ),
    ).rejects.toMatchObject({ cause: { reasons: [{ _tag: "Fail", error: failure }] } });
    expect(entered).toBe(false);
    expect(entries).toHaveLength(0);
  });
});
