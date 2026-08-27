import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as GitHub from "alchemy/GitHub";
import { Config, Effect, Layer } from "effect";

const owner = "mateoroldos";
const repository = "effect-forge";

/** Provisions scoped provider credentials for GitHub Actions. */
export default Alchemy.Stack(
  "EffectForgeGitHub",
  {
    providers: Layer.merge(Cloudflare.providers(), GitHub.providers()),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const { accountId } = yield* yield* Cloudflare.CloudflareEnvironment;
    const neonApiKey = yield* Config.redacted("NEON_API_KEY");

    const token = yield* Cloudflare.ApiToken.AccountApiToken("CIToken", {
      name: "effect-forge-ci",
      accountId,
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            // Workers and static assets.
            "Workers Scripts Write",
            "Workers KV Storage Write",
            "Workers Observability Write",
            "Workers Tail Read",
            "Hyperdrive Write",
            // Cloudflare.state() mounts its token in an edge-preview Worker,
            // which requires Write rather than Read.
            "Secrets Store Write",
            "Account Settings Write",
          ],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: "*",
          },
        },
        {
          effect: "allow",
          permissionGroups: [
            "Workers Routes Write",
            "Zone Read",
            "DNS Write",
            "Dynamic URL Redirects Write",
          ],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: {
              "com.cloudflare.api.account.zone.*": "*",
            },
          },
        },
      ],
    });

    yield* GitHub.Secrets({
      owner,
      repository,
      secrets: {
        CLOUDFLARE_API_TOKEN: token.value,
        CLOUDFLARE_ACCOUNT_ID: accountId,
        NEON_API_KEY: neonApiKey,
      },
    });

    return { tokenId: token.tokenId };
  }),
);
