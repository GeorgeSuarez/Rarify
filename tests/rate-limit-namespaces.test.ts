import { describe, expect, it } from "vitest";
import { rateLimitNamespaces } from "@/src/rate-limit-namespaces";

describe("rateLimitNamespaces", () => {
  it("keeps the base ids for production", () => {
    expect(rateLimitNamespaces("prod")).toEqual({ auth: 1001, api: 1002 });
  });

  it("gives every stage its own block", () => {
    // Cloudflare shares counters for a namespace across the whole account, so a
    // collision here would let preview traffic spend production's allowance.
    const prod = rateLimitNamespaces("prod");
    const preview = rateLimitNamespaces("preview");
    const local = rateLimitNamespaces("live_someone");

    expect(preview).not.toEqual(prod);
    expect(local).not.toEqual(prod);
    expect(local).not.toEqual(preview);
  });

  it("never reuses one namespace id across stages", () => {
    const ids = ["prod", "preview", "live_someone", "staging"].flatMap((stage) => {
      const namespaces = rateLimitNamespaces(stage);

      return [namespaces.auth, namespaces.api];
    });

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("separates the two buckets within a stage", () => {
    const { auth, api } = rateLimitNamespaces("prod");

    expect(auth).not.toBe(api);
  });

  it("returns positive integers for every stage", () => {
    for (const stage of ["prod", "preview", "live_someone", ""]) {
      const { auth, api } = rateLimitNamespaces(stage);

      expect(Number.isInteger(auth)).toBe(true);
      expect(Number.isInteger(api)).toBe(true);
      expect(auth).toBeGreaterThan(0);
      expect(api).toBeGreaterThan(0);
    }
  });
});
