import { describe, expect, it } from "vitest";
import { apiRoutePatterns } from "@/src/deployment-routes";

describe("deployment route patterns", () => {
  it("routes the API and auth namespaces on the website hostname", () => {
    const patterns = apiRoutePatterns("rarify.georgejsuarez.com");

    expect(patterns.map((route) => route.pattern)).toEqual([
      "rarify.georgejsuarez.com/api/*",
      "rarify.georgejsuarez.com/auth/*",
    ]);
  });

  it("infers the Cloudflare zone from the domain", () => {
    for (const route of apiRoutePatterns("rarify.georgejsuarez.com")) {
      expect(route.zoneName).toBe("georgejsuarez.com");
    }
  });

  it("keeps the same host for preview stages", () => {
    const [api, auth] = apiRoutePatterns("preview.rarify.georgejsuarez.com");
    expect(api?.pattern).toBe("preview.rarify.georgejsuarez.com/api/*");
    expect(auth?.pattern).toBe("preview.rarify.georgejsuarez.com/auth/*");
    expect(api?.zoneName).toBe("georgejsuarez.com");
  });

  it("is more specific than the website's catch-all host route", () => {
    const [api] = apiRoutePatterns("rarify.georgejsuarez.com");
    const websiteHostRoute = "rarify.georgejsuarez.com/*";

    // Cloudflare picks the most specific matching pattern; the API pattern
    // carries an extra path segment, so it wins for /api/* requests.
    expect(api?.pattern.length).toBeGreaterThan(websiteHostRoute.length - 2);
    expect(api?.pattern.startsWith("rarify.georgejsuarez.com/")).toBe(true);
    expect(api?.pattern.endsWith("/api/*")).toBe(true);
  });
});

describe("website deep-link fallback", () => {
  it("serves the SPA shell for unmatched client routes", async () => {
    const { websiteAssets, websiteDomain, ZONE_NAME } = await import(
      "@/src/website"
    );
    expect(websiteAssets.notFoundHandling).toBe("single-page-application");
    expect(websiteDomain("rarify.georgejsuarez.com")).toEqual({
      name: "rarify.georgejsuarez.com",
      zoneName: ZONE_NAME,
    });
    expect(websiteDomain(null)).toBeNull();
  });
});
