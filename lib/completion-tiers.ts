/**
 * Completion percentage tiers from untouched to perfect, ascending by `min`.
 * Every percentage from `0` through `100` belongs to exactly one tier.
 */
export const COMPLETION_TIERS = [
  {
    min: 0,
    textClassName: "text-muted-foreground",
    barClassName: "bg-muted-foreground",
    color: "var(--muted-foreground)",
  },
  {
    min: 1,
    textClassName: "text-red-400",
    barClassName: "bg-red-400",
    color: "#f87171",
  },
  {
    min: 25,
    textClassName: "text-orange-400",
    barClassName: "bg-orange-400",
    color: "#fb923c",
  },
  {
    min: 50,
    textClassName: "text-yellow-400",
    barClassName: "bg-yellow-400",
    color: "#facc15",
  },
  {
    min: 75,
    textClassName: "text-lime-400",
    barClassName: "bg-lime-400",
    color: "#a3e635",
  },
  {
    min: 100,
    textClassName: "text-green-400",
    barClassName: "bg-green-400",
    color: "#4ade80",
  },
] as const;

/**
 * A completion percentage tier. Render `textClassName` on percentage labels,
 * `barClassName` on progress-bar indicators, and `color` where a class cannot
 * reach (SVG strokes, chart data).
 */
export type CompletionTier = (typeof COMPLETION_TIERS)[number];

/**
 * Return the completion tier for a percentage between `0` (untouched) and
 * `100` (perfect). Non-finite percentages count as untouched.
 */
export function completionTierOf(percent: number): CompletionTier {
  if (!Number.isFinite(percent)) return COMPLETION_TIERS[0];
  let tier: CompletionTier = COMPLETION_TIERS[0];

  for (const candidate of COMPLETION_TIERS) {
    if (percent < candidate.min) break;
    tier = candidate;
  }

  return tier;
}
