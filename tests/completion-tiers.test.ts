import { describe, expect, it } from "vitest";

import { COMPLETION_TIERS, completionTierOf } from "@/lib/completion-tiers";

describe("completionTierOf", () => {
  it.each([
    { percent: 0, min: 0 },
    { percent: 1, min: 1 },
    { percent: 24, min: 1 },
    { percent: 25, min: 25 },
    { percent: 49, min: 25 },
    { percent: 50, min: 50 },
    { percent: 74, min: 50 },
    { percent: 75, min: 75 },
    { percent: 99, min: 75 },
    { percent: 100, min: 100 },
  ])("maps $percent% to the tier starting at $min%", ({ percent, min }) => {
    expect(completionTierOf(percent).min).toBe(min);
  });

  it("clamps percentages outside the 0-100 range", () => {
    expect(completionTierOf(-5).min).toBe(0);
    expect(completionTierOf(150).min).toBe(100);
  });

  it("treats non-finite percentages as untouched", () => {
    expect(completionTierOf(Number.NaN).min).toBe(0);
    expect(completionTierOf(Number.POSITIVE_INFINITY).min).toBe(0);
  });

  it("orders tiers by ascending lower bound", () => {
    const minimums = COMPLETION_TIERS.map((tier) => tier.min);
    expect(minimums).toEqual([...minimums].sort((a, b) => a - b));
  });
});
