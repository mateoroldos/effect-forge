import type { WebWorkerEnv } from "../worker.ts";

declare global {
  namespace App {
    interface Platform {
      readonly ctx: ExecutionContext;
      readonly env: WebWorkerEnv;
    }
  }
}

export {};
