import type { WebWorkerEnv } from "../worker.ts";

declare global {
  namespace App {
    interface Platform {
      readonly env: WebWorkerEnv;
    }
  }
}

export {};
