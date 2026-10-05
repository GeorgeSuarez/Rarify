/**
 * Emits a stage-aware `robots.txt` during the Vite build.
 *
 * `preview-rarify.georgejsuarez.com` serves the same bundle as production, so a
 * static file would advertise the production sitemap from the preview host and
 * invite Google to crawl a duplicate of the whole app. The preview stage sets
 * `PUBLIC_APP_URL` to its own origin (see .github/workflows/preview.yml), so the
 * build can tell the two apart.
 *
 * The default is the permissive production file: a missing `PUBLIC_APP_URL`
 * must never quietly deindex production, and a crawled preview is the cheaper
 * mistake to recover from.
 */
import { loadEnv, type Plugin } from "vite";

/** Origin served by the production stage. Every other known origin is a preview. */
const productionOrigin = "https://rarify.georgejsuarez.com";

const productionRobots = `# Rarify is a login-gated Steam dashboard. Only /login is public; every other
# screen redirects anonymous visitors to it, so crawling them wastes crawl budget.
User-agent: *
Allow: /

Disallow: /api/
Disallow: /auth/
Disallow: /games
Disallow: /achievements
Disallow: /insights
Disallow: /friends
Disallow: /settings

Sitemap: https://rarify.georgejsuarez.com/sitemap.xml
`;

const previewRobots = `# Preview stage: not a canonical copy of Rarify, so nothing here should be
# crawled or indexed. Production lives at https://rarify.georgejsuarez.com.
User-agent: *
Disallow: /
`;

/**
 * Pick the robots.txt for an origin. An empty or production origin yields the
 * permissive file; any other origin is a preview stage.
 */
export function robotsTxtFor(origin: string): string {
  const isKnownPreview = origin.length > 0 && origin !== productionOrigin;

  return isKnownPreview ? previewRobots : productionRobots;
}

/** Vite plugin that writes the stage's `robots.txt` into the build output. */
export function robotsTxt(): Plugin {
  let contents = productionRobots;

  return {
    name: "rarify-robots-txt",
    apply: "build",
    configResolved(config) {
      // An empty prefix loads unprefixed keys too, which is where PUBLIC_APP_URL lives.
      const env = loadEnv(config.mode, config.root, "");

      contents = robotsTxtFor(env.PUBLIC_APP_URL ?? "");
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: contents });
    },
  };
}
