const rootDomain = "effect-forge.com";

export interface StageHost {
  readonly hostname: string;
  readonly origin: `https://${string}`;
}

/** Resolves one deployed application's host, leaving local development unmanaged. */
export const stageHostFor = (stage: string): StageHost | null => {
  if (stage.startsWith("dev_")) return null;

  const hostname = stage === "prod" ? `app.${rootDomain}` : `${stage}.${rootDomain}`;
  return { hostname, origin: `https://${hostname}` };
};

export const zoneName = rootDomain;
