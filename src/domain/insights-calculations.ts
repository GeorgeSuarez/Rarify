import type { Game, RarityTier } from "../../lib/types.ts";
import { completionTierOf } from "../../lib/completion-tiers.ts";
import { hasEarnedAllGameAchievements } from "./dashboard-calculations.ts";

const ACHIEVEMENT_SHORTLIST_LIMIT = 3;

const NEAR_COMPLETION_PERCENT = 80;

const RECENT_UNLOCK_DAYS = 30;

const SECONDS_PER_DAY = 86_400;

/** Summary of all achievements across games that support achievements. */
export interface AchievementPortfolioSummary {
  /** Number of games with at least one possible achievement. */
  readonly eligibleGames: number;
  /** Number of achievements already earned in those games. */
  readonly earnedAchievements: number;
  /** Total possible achievements across those games. */
  readonly possibleAchievements: number;
  /** Possible achievements not yet earned. */
  readonly remainingAchievements: number;
  /** Weighted completion: earned divided by possible achievements, rounded to one decimal. */
  readonly completionPercent: number;
  /** Number of eligible games where every achievement is earned. */
  readonly perfectGames: number;
}

/** One completion-percentage range and its number of eligible games. */
export interface CompletionBandSummary {
  /** Exact percentage range shown in the completion distribution. */
  readonly label: string;
  /** Number of games whose earned-to-possible ratio falls in this range. */
  readonly count: number;
  /** Completion-tier color token for this range. */
  readonly color: string;
}

/** Recorded achievement unlock counts for rolling 7-day and 30-day periods. */
export interface AchievementUnlockMomentum {
  /** Unlock timestamps between the 7-day cutoff and now, in seconds. */
  readonly last7Days: number;
  /** Unlock timestamps between the 30-day cutoff and now, in seconds. */
  readonly last30Days: number;
}

/** Tracked-game counts and shortlists for completion and recent-unlock focus. */
export interface TrackedGameHealthSummary {
  /** Total tracked games, including games without achievement data. */
  readonly trackedGameCount: number;
  /** Tracked incomplete games at or above the near-completion threshold. */
  readonly nearPerfectCount: number;
  /** Up to three tracked games closest to perfect completion. */
  readonly nearPerfectGames: ReadonlyArray<Game>;
  /** Tracked incomplete games with no recorded unlock in the last 30 days. */
  readonly noRecentUnlockCount: number;
  /** Up to three games without a recent unlock, oldest or absent first. */
  readonly noRecentUnlockGames: ReadonlyArray<Game>;
}

/** Sum all bucket counts in a rarity distribution without dropping earlier tiers. */
export function sumRarityDistributionCounts(tiers: ReadonlyArray<RarityTier>): number {
  return tiers.reduce((total, tier) => total + tier.count, 0);
}

/**
 * Summarize earned, possible, and remaining achievements across the library.
 * Games with zero possible achievements do not affect the weighted percentage.
 */
export function summarizeAchievementPortfolio(
  games: ReadonlyArray<Game>,
): AchievementPortfolioSummary {
  const eligibleGames = games.filter((game) => game.achievements.total > 0);

  const earnedAchievements = eligibleGames.reduce(
    (total, game) => total + game.achievements.earned,
    0,
  );

  const possibleAchievements = eligibleGames.reduce(
    (total, game) => total + game.achievements.total,
    0,
  );

  const remainingAchievements = eligibleGames.reduce(
    (total, game) => total + Math.max(game.achievements.total - game.achievements.earned, 0),
    0,
  );

  const perfectGames = eligibleGames.filter(hasEarnedAllGameAchievements).length;

  const completionPercent =
    possibleAchievements === 0
      ? 0
      : Math.round((earnedAchievements / possibleAchievements) * 1000) / 10;

  return {
    eligibleGames: eligibleGames.length,
    earnedAchievements,
    possibleAchievements,
    remainingAchievements,
    completionPercent,
    perfectGames,
  };
}

/**
 * Return up to three incomplete games with the fewest achievements remaining.
 * Ties are ordered by the higher exact completion percentage.
 */
export function selectGamesNearCompletion(games: ReadonlyArray<Game>): ReadonlyArray<Game> {
  return games
    .filter(
      (game) => game.achievements.total > 0 && game.achievements.earned < game.achievements.total,
    )
    .toSorted((left, right) => {
      const leftRemaining = left.achievements.total - left.achievements.earned;
      const rightRemaining = right.achievements.total - right.achievements.earned;
      const remainingDifference = leftRemaining - rightRemaining;

      if (remainingDifference !== 0) return remainingDifference;

      const leftCompletion = left.achievements.earned / left.achievements.total;
      const rightCompletion = right.achievements.earned / right.achievements.total;

      return rightCompletion - leftCompletion;
    })
    .slice(0, ACHIEVEMENT_SHORTLIST_LIMIT);
}

/**
 * Count recorded unlock timestamps in rolling 7-day and 30-day windows.
 * `nowMs` is milliseconds since the Unix epoch; game unlock times are seconds.
 */
export function summarizeAchievementUnlockMomentum(
  games: ReadonlyArray<Game>,
  nowMs: number,
): AchievementUnlockMomentum {
  const nowSeconds = nowMs / 1000;
  const last7DaysCutoff = nowSeconds - 7 * SECONDS_PER_DAY;
  const last30DaysCutoff = nowSeconds - 30 * SECONDS_PER_DAY;
  let last7Days = 0;
  let last30Days = 0;

  for (const game of games) {
    for (const unlocktime of game.unlocktimes) {
      if (unlocktime > nowSeconds) continue;

      if (unlocktime >= last30DaysCutoff) last30Days += 1;

      if (unlocktime >= last7DaysCutoff) last7Days += 1;
    }
  }

  return { last7Days, last30Days };
}

/**
 * Summarize tracked games worth revisiting using recorded unlock times.
 * The `nowMs` argument is milliseconds since the Unix epoch.
 */
export function summarizeTrackedGameHealth(
  games: ReadonlyArray<Game>,
  nowMs: number,
): TrackedGameHealthSummary {
  const trackedGames = games.filter((game) => game.tracked);

  const trackedIncompleteGames = trackedGames.filter(
    (game) => game.achievements.total > 0 && game.achievements.earned < game.achievements.total,
  );

  const nearPerfectGames = trackedIncompleteGames
    .filter(
      (game) =>
        (game.achievements.earned / game.achievements.total) * 100 >= NEAR_COMPLETION_PERCENT,
    )
    .toSorted((left, right) => {
      const remainingDifference =
        left.achievements.total -
        left.achievements.earned -
        (right.achievements.total - right.achievements.earned);

      if (remainingDifference !== 0) return remainingDifference;

      return right.completion - left.completion;
    });

  const recentUnlockCutoff = nowMs / 1000 - RECENT_UNLOCK_DAYS * SECONDS_PER_DAY;

  const noRecentUnlockGames = trackedIncompleteGames
    .filter((game) => {
      const latestUnlock = game.unlocktimes.reduce(
        (latest, unlocktime) => Math.max(latest, unlocktime),
        0,
      );

      return latestUnlock < recentUnlockCutoff;
    })
    .toSorted((left, right) => {
      const leftLatestUnlock = left.unlocktimes.reduce(
        (latest, unlocktime) => Math.max(latest, unlocktime),
        0,
      );

      const rightLatestUnlock = right.unlocktimes.reduce(
        (latest, unlocktime) => Math.max(latest, unlocktime),
        0,
      );

      return leftLatestUnlock - rightLatestUnlock;
    });

  return {
    trackedGameCount: trackedGames.length,
    nearPerfectCount: nearPerfectGames.length,
    nearPerfectGames: nearPerfectGames.slice(0, ACHIEVEMENT_SHORTLIST_LIMIT),
    noRecentUnlockCount: noRecentUnlockGames.length,
    noRecentUnlockGames: noRecentUnlockGames.slice(0, ACHIEVEMENT_SHORTLIST_LIMIT),
  };
}

/**
 * Count achievement completion bands without losing exact zero or perfect games.
 * Only games with at least one possible achievement are included.
 */
export function summarizeCompletionBands(
  games: ReadonlyArray<Game>,
): ReadonlyArray<CompletionBandSummary> {
  const definitions = [
    {
      label: "0%",
      colorAt: 0,
      matches: (percent: number) => percent === 0,
    },
    {
      label: ">0–25%",
      colorAt: 1,
      matches: (percent: number) => percent > 0 && percent <= 25,
    },
    {
      label: ">25–50%",
      colorAt: 25,
      matches: (percent: number) => percent > 25 && percent <= 50,
    },
    {
      label: ">50–75%",
      colorAt: 50,
      matches: (percent: number) => percent > 50 && percent <= 75,
    },
    {
      label: ">75–<100%",
      colorAt: 75,
      matches: (percent: number) => percent > 75 && percent < 100,
    },
    {
      label: "100%",
      colorAt: 100,
      matches: (percent: number) => percent >= 100,
    },
  ] as const;

  const eligibleGames = games.filter((game) => game.achievements.total > 0);

  return definitions.map((definition) => ({
    label: definition.label,
    count: eligibleGames.filter((game) => {
      const percent = (game.achievements.earned / game.achievements.total) * 100;

      return definition.matches(percent);
    }).length,
    color: completionTierOf(definition.colorAt).color,
  }));
}
