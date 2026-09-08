const rootDomain = "effect-forge.com";

export interface StageHost {
  readonly hostname: string;
  readonly origin: `https://${string}`;
}

export interface StageHosts {
  readonly web: StageHost | null;
  readonly api: StageHost | null;
}

/** Resolves one deployed application's host, leaving local development unmanaged. */
export const stageHostFor = (stage: string): StageHost | null => {
  if (stage.startsWith("dev_")) return null;

  const hostname = stage === "prod" ? `app.${rootDomain}` : `${stage}.${rootDomain}`;
  return { hostname, origin: `https://${hostname}` };
};

/** Models the target public hosts without changing the API's current shared-host route. */
export const stageHostsFor = (stage: string): StageHosts => {
  const web = stageHostFor(stage);
  if (web === null) return { web: null, api: null };

  const hostname = stage === "prod" ? `api.${rootDomain}` : `api.${stage}.${rootDomain}`;
  return { web, api: { hostname, origin: `https://${hostname}` } };
};

export const zoneName = rootDomain;
