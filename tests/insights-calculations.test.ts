import { describe, expect, it } from "vitest";
import type { Game } from "@/lib/types";
import {
  selectGamesNearCompletion,
  summarizeAchievementPortfolio,
  summarizeAchievementUnlockMomentum,
  summarizeCompletionBands,
  summarizeTrackedGameHealth,
  sumRarityDistributionCounts,
} from "@/src/domain/insights-calculations";

const NOW_MS = Date.UTC(2026, 8, 14, 12);

const NOW_SECONDS = NOW_MS / 1000;

const SECONDS_PER_DAY = 86_400;

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    appId: 1,
    name: "Test game",
    hours: 10,
    completion: 50,
    achievements: { earned: 5, total: 10 },
    comparison: { text: "ahead of", percent: 50, isPositive: true },
    image: "",
    owned: true,
    tracked: false,
    unlocktimes: [],
    ...overrides,
  };
}

describe("sumRarityDistributionCounts", () => {
  it("adds every rarity bucket instead of returning the final bucket only", () => {
    expect(
      sumRarityDistributionCounts([
        { tier: "Common", count: 20, color: "var(--muted-foreground)" },
        { tier: "Rare", count: 5, color: "var(--color-blue-400)" },
        { tier: "Ultra Rare", count: 2, color: "var(--color-amber-400)" },
      ]),
    ).toBe(27);
  });
});

describe("summarizeAchievementPortfolio", () => {
  it("calculates weighted completion and remaining achievements", () => {
    const games = [
      makeGame({ achievements: { earned: 5, total: 10 } }),
      makeGame({ appId: 2, achievements: { earned: 9, total: 9 } }),
      makeGame({ appId: 3, achievements: { earned: 0, total: 0 } }),
    ];

    expect(summarizeAchievementPortfolio(games)).toEqual({
      eligibleGames: 2,
      earnedAchievements: 14,
      possibleAchievements: 19,
      remainingAchievements: 5,
      completionPercent: 73.7,
      perfectGames: 1,
    });
  });

  it("returns a zero summary when no games have achievements", () => {
    expect(
      summarizeAchievementPortfolio([makeGame({ achievements: { earned: 0, total: 0 } })]),
    ).toEqual({
      eligibleGames: 0,
      earnedAchievements: 0,
      possibleAchievements: 0,
      remainingAchievements: 0,
      completionPercent: 0,
      perfectGames: 0,
    });
  });
});

describe("selectGamesNearCompletion", () => {
  it("sorts incomplete games by trophies remaining and excludes completed or ineligible games", () => {
    const oneRemaining = makeGame({
      appId: 1,
      name: "One left",
      achievements: { earned: 9, total: 10 },
      completion: 90,
    });

    const twoRemaining = makeGame({
      appId: 2,
      name: "Two left",
      achievements: { earned: 8, total: 10 },
      completion: 80,
    });

    const tenRemaining = makeGame({
      appId: 3,
      name: "Ten left",
      achievements: { earned: 90, total: 100 },
      completion: 90,
    });

    const completed = makeGame({
      appId: 4,
      achievements: { earned: 10, total: 10 },
      completion: 100,
    });

    const noAchievements = makeGame({
      appId: 5,
      achievements: { earned: 0, total: 0 },
    });

    expect(
      selectGamesNearCompletion([
        tenRemaining,
        completed,
        twoRemaining,
        noAchievements,
        oneRemaining,
      ]).map((game) => game.name),
    ).toEqual(["One left", "Two left", "Ten left"]);
  });

  it("returns no more than three games", () => {
    const games = Array.from({ length: 5 }, (_, index) =>
      makeGame({
        appId: index + 1,
        achievements: { earned: index, total: 10 },
      }),
    );

    expect(selectGamesNearCompletion(games)).toHaveLength(3);
  });
});

describe("summarizeAchievementUnlockMomentum", () => {
  it("counts recorded timestamps in rolling windows and excludes future unlocks", () => {
    const games = [
      makeGame({
        unlocktimes: [
          NOW_SECONDS,
          NOW_SECONDS - 7 * SECONDS_PER_DAY,
          NOW_SECONDS - 8 * SECONDS_PER_DAY,
          NOW_SECONDS - 30 * SECONDS_PER_DAY,
          NOW_SECONDS - 31 * SECONDS_PER_DAY,
          NOW_SECONDS + SECONDS_PER_DAY,
        ],
      }),
    ];

    expect(summarizeAchievementUnlockMomentum(games, NOW_MS)).toEqual({
      last7Days: 2,
      last30Days: 4,
    });
  });

  it("returns zero counts when no unlocks fall inside either window", () => {
    const game = makeGame({ unlocktimes: [0, NOW_SECONDS - 31 * SECONDS_PER_DAY] });

    expect(summarizeAchievementUnlockMomentum([game], NOW_MS)).toEqual({
      last7Days: 0,
      last30Days: 0,
    });
  });
});

describe("summarizeTrackedGameHealth", () => {
  it("finds near-perfect tracked games and tracked games with no recent recorded unlock", () => {
    const recentNearPerfect = makeGame({
      appId: 1,
      name: "Recent near-perfect",
      tracked: true,
      completion: 90,
      achievements: { earned: 9, total: 10 },
      unlocktimes: [NOW_SECONDS - 2 * SECONDS_PER_DAY],
    });

    const quietNearPerfect = makeGame({
      appId: 2,
      name: "Quiet near-perfect",
      tracked: true,
      completion: 90,
      achievements: { earned: 9, total: 10 },
      unlocktimes: [NOW_SECONDS - 45 * SECONDS_PER_DAY],
    });

    const unplayedTracked = makeGame({
      appId: 3,
      name: "Unplayed tracked",
      tracked: true,
      completion: 0,
      achievements: { earned: 0, total: 10 },
      unlocktimes: [],
    });

    const completedTracked = makeGame({
      appId: 4,
      name: "Completed tracked",
      tracked: true,
      completion: 100,
      achievements: { earned: 10, total: 10 },
    });

    const quietUntracked = makeGame({
      appId: 5,
      name: "Quiet untracked",
      tracked: false,
      unlocktimes: [],
    });

    expect(
      summarizeTrackedGameHealth(
        [recentNearPerfect, quietNearPerfect, unplayedTracked, completedTracked, quietUntracked],
        NOW_MS,
      ),
    ).toEqual({
      trackedGameCount: 4,
      nearPerfectCount: 2,
      nearPerfectGames: [recentNearPerfect, quietNearPerfect],
      noRecentUnlockCount: 2,
      noRecentUnlockGames: [unplayedTracked, quietNearPerfect],
    });
  });

  it("returns empty lists when no tracked games have achievement data", () => {
    expect(
      summarizeTrackedGameHealth(
        [makeGame({ tracked: true, achievements: { earned: 0, total: 0 } })],
        NOW_MS,
      ),
    ).toEqual({
      trackedGameCount: 1,
      nearPerfectCount: 0,
      nearPerfectGames: [],
      noRecentUnlockCount: 0,
      noRecentUnlockGames: [],
    });
  });
});

describe("summarizeCompletionBands", () => {
  it("assigns inclusive percentage boundaries to exactly one completion band", () => {
    const games = [
      makeGame({ appId: 1, achievements: { earned: 25, total: 100 } }),
      makeGame({ appId: 2, achievements: { earned: 26, total: 100 } }),
      makeGame({ appId: 3, achievements: { earned: 50, total: 100 } }),
      makeGame({ appId: 4, achievements: { earned: 51, total: 100 } }),
      makeGame({ appId: 5, achievements: { earned: 75, total: 100 } }),
      makeGame({ appId: 6, achievements: { earned: 76, total: 100 } }),
    ];

    expect(summarizeCompletionBands(games).map((band) => band.count)).toEqual([0, 1, 2, 2, 1, 0]);
  });

  it("includes exactly zero and perfect games in separate completion bands", () => {
    const games = [
      makeGame({ appId: 1, achievements: { earned: 0, total: 10 } }),
      makeGame({ appId: 2, achievements: { earned: 1, total: 10 } }),
      makeGame({ appId: 3, achievements: { earned: 3, total: 10 } }),
      makeGame({ appId: 4, achievements: { earned: 6, total: 10 } }),
      makeGame({ appId: 5, achievements: { earned: 9, total: 10 } }),
      makeGame({ appId: 6, achievements: { earned: 10, total: 10 } }),
      makeGame({ appId: 7, achievements: { earned: 0, total: 0 } }),
    ];

    expect(summarizeCompletionBands(games).map(({ label, count }) => [label, count])).toEqual([
      ["0%", 1],
      [">0–25%", 1],
      [">25–50%", 1],
      [">50–75%", 1],
      [">75–<100%", 1],
      ["100%", 1],
    ]);
  });
});
