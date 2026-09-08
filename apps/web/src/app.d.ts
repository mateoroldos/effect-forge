import type { WebWorkerEnv } from "../worker.ts";
import type { ApplicationRuntime } from "#lib/server/application.ts";

declare global {
  namespace App {
    interface Locals {
      application: ApplicationRuntime.Runtime;
    }

    interface Platform {
      readonly env: WebWorkerEnv;
    }
  }
}

export {};
