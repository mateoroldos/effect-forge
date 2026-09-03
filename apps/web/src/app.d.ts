import type { WebWorkerEnv } from "../../../alchemy.run.ts";

declare global {
  namespace App {
    interface Platform {
      readonly env: WebWorkerEnv;
    }
  }
}

export {};
