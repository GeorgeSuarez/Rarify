/**
 * Return the Steam CDN header-art URL used by game cards and achievement lists.
 *
 * @param appId - Steam application identifier.
 * @returns The public Steam CDN URL for that game's header image.
 */
export function getGameHeaderImage(appId: number): string {
  return `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
}
