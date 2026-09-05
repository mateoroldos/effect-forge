import type { WebWorkerEnv } from "../worker.ts";
import type { WebRuntime } from "#lib/server/runtime.ts";

declare global {
  namespace App {
    interface Locals {
      runtime: WebRuntime.Runtime;
    }

    interface Platform {
      readonly ctx: ExecutionContext;
      readonly env: WebWorkerEnv;
    }
  }
}

export {};
