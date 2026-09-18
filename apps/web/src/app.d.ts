import type { WebWorkerEnv } from "../worker.ts";
import type { ExecutionContext } from "@cloudflare/workers-types";
import type { WebRuntime } from "#lib/server/runtime.ts";

declare global {
  namespace App {
    interface Locals {
      run: WebRuntime.Run;
    }

    interface Platform {
      readonly ctx: ExecutionContext;
      readonly env: WebWorkerEnv;
    }
  }
}

export {};
