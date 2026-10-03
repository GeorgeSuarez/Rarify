import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import * as GitHub from "alchemy/GitHub";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";

const OWNER = "GeorgeSuarez";
const REPOSITORY = "Rarify";

/**
 * One-shot bootstrap stack: mints the scoped Cloudflare API token that
 * GitHub Actions deploys with, and stores it (plus the account ID) as
 * repository secrets.
 *
 * Deploy once from your laptop under an `admin` profile that can create
 * tokens (Global API Key + email):
 *
 * ```sh
 * npx alchemy profile create admin
 * npx alchemy profile edit --profile admin --add Cloudflare
 * npx alchemy deploy --config stacks/github.ts --profile admin --yes
 * ```
 *
 * Re-run it to rotate the token or change its permissions.
 */
export default Alchemy.Stack(
  "RarifyGithub",
  {
    providers: Layer.mergeAll(
      Cloudflare.providers(),
      GitHub.providers(),
    ),
    state: Cloudflare.state(),
  },
  Effect.gen(function* () {
    const { accountId } = yield* yield* Cloudflare.CloudflareEnvironment;

    const apiToken = yield* Cloudflare.ApiToken.AccountApiToken("CIToken", {
      name: "rarify-github-actions",
      accountId,
      policies: [
        {
          effect: "allow",
          permissionGroups: [
            "Secrets Store Write",
            "Workers Scripts Write",
            "Workers Routes Write",
            "Workers Tail Read",
            "D1 Write",
            "Account Settings Write",
          ],
          resources: { [`com.cloudflare.api.account.${accountId}`]: "*" },
        },
        {
          effect: "allow",
          permissionGroups: ["DNS Write", "SSL and Certificates Write"],
          resources: {
            [`com.cloudflare.api.account.${accountId}`]: {
              "com.cloudflare.api.account.zone.*": "*",
            },
          },
        },
      ],
    });

    yield* GitHub.Secret("cf-api-token", {
      owner: OWNER,
      repository: REPOSITORY,
      name: "CLOUDFLARE_API_TOKEN",
      value: apiToken.value,
    });

    yield* GitHub.Secret("cf-account-id", {
      owner: OWNER,
      repository: REPOSITORY,
      name: "CLOUDFLARE_ACCOUNT_ID",
      value: Redacted.make(accountId),
    });

    return { tokenId: apiToken.tokenId };
  }),
);
