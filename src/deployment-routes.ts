import { ZONE_NAME } from "./website.ts";

/**
 * Zone route patterns that keep the API and Steam auth endpoints on the same
 * hostname as the SPA while leaving every other path to the website Worker.
 *
 * @param domain - Hostname served by the Alchemy stack.
 * @returns The API Worker's zone routes, most specific first.
 */
export function apiRoutePatterns(
  domain: string,
): Array<{ readonly pattern: string; readonly zoneName: string }> {
  return [
    { pattern: `${domain}/api/*`, zoneName: ZONE_NAME },
    { pattern: `${domain}/auth/*`, zoneName: ZONE_NAME },
  ];
}
