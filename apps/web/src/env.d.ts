import type { WebWorkerEnv } from "../../../alchemy.run.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends WebWorkerEnv {}
  }
}
