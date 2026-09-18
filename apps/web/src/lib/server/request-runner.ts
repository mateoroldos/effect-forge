import { Cause, Effect, Exit, ManagedRuntime, Result } from "effect";
import { Observability } from "./observability.ts";

/** Executes request operations without reducing mixed causes to a single typed failure. */
export const make =
  <R, ER>(runtime: ManagedRuntime.ManagedRuntime<R, ER>, signal: AbortSignal) =>
  <A, E extends { readonly _tag: string }>(name: string, program: Effect.Effect<A, E, R>) => {
    // Effect evaluates synchronous work before attaching the signal listener.
    if (signal.aborted) {
      return Promise.reject(
        new Error(`Application operation ${name} cancelled`, { cause: Cause.interrupt() }),
      );
    }
    return runtime
      .runPromiseExit(
        program.pipe(
          Effect.tapError((failure) => Effect.annotateCurrentSpan("error.type", failure._tag)),
          Observability.operation(name),
          Effect.exit,
          Effect.flatMap((exit): Effect.Effect<Result.Result<A, E>, E> => {
            if (Exit.isSuccess(exit)) return Effect.succeed(Result.succeed(exit.value));
            const [reason] = exit.cause.reasons;
            if (
              exit.cause.reasons.length === 1 &&
              reason !== undefined &&
              Cause.isFailReason(reason)
            ) {
              return Effect.succeed(Result.fail(reason.error));
            }
            return Effect.failCause(exit.cause);
          }),
        ),
        { signal },
      )
      .then((exit) => {
        if (Exit.isFailure(exit)) {
          // runPromise squashes a mixed cause to its first failure in Effect 4.
          throw new Error(`Application operation ${name} failed`, { cause: exit.cause });
        }
        return exit.value;
      });
  };

export * as RequestRunner from "./request-runner.ts";
