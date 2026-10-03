import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Option from "effect/Option";

/** Cloudflare zone that hosts every Rarify hostname. */
export const ZONE_NAME = "georgejsuarez.com";

/** Vite dev-server port used while running the SPA locally. */
export const DEV_PORT = 5173;

/** Static-asset routing that lets the client router own deep links. */
export interface WebsiteAssets {
  readonly notFoundHandling: "single-page-application";
}

/**
 * Asset routing for the SPA: any path that is not a built file falls back to
 * `index.html` so React Router can render the deep-linked route.
 */
export const websiteAssets: WebsiteAssets = {
  notFoundHandling: "single-page-application",
};

/**
 * Custom-domain configuration for the website Worker.
 *
 * @param domain - Hostname to attach, or `null` to leave the Worker on its
 * `workers.dev` URL during local development.
 * @returns The Worker domain prop.
 */
export function websiteDomain(
  domain: string | null,
): { readonly name: string; readonly zoneName: string } | null {
  return domain === null ? null : { name: domain, zoneName: ZONE_NAME };
}

/**
 * Alchemy-managed Vite website serving the client-side React application.
 *
 * The host is optional in local development. Preview and production deploys
 * set `PUBLIC_APP_DOMAIN` to their own host under `georgejsuarez.com`.
 */
export const Website = Cloudflare.Website.Vite("Website", {
  domain: Config.option(Config.String("PUBLIC_APP_DOMAIN")).pipe(
    Config.map((domain) => websiteDomain(Option.getOrNull(domain))),
  ),
  assets: websiteAssets,
  dev: {
    port: DEV_PORT,
  },
});
