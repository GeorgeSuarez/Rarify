import { describe, it, expect } from "vitest";
import {
  buildAlphabetIndex,
  computeStats as computeStatsAt,
  filterGames,
  indexLetterOfName,
  meanGlobalPercent,
} from "@/src/domain/dashboard-calculations";
import { DASHBOARD_FILTERS } from "@/lib/types";
import type { Game, SteamGlobalAchievement } from "@/lib/types";
import {
  globalAchievementsFixture,
  ownedGamesFixture,
  playerAchievementsFixture,
  privateProfileFixture,
  emptyGamesFixture,
} from "./fixtures/steam";

const NOW = Date.now();

const computeStats = (games: ReadonlyArray<Game>) => computeStatsAt(games, NOW);

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    appId: 100,
    name: "Test Game",
    hours: 50,
    completion: 75,
    achievements: { earned: 30, total: 40 },
    comparison: { text: "You're ahead of", percent: 45, isPositive: true },
    image: "https://example.com/img.jpg",
    owned: true,
    tracked: true,
    unlocktimes: [],
    ...overrides,
  };
}

// --- computeStats ---

describe("computeStats", () => {
  it("sums achievementsEarned across games", () => {
    const games = [
      makeGame({ achievements: { earned: 10, total: 20 } }),
      makeGame({ achievements: { earned: 30, total: 40 } }),
    ];
    expect(computeStats(games).achievementsEarned).toBe(40);
  });

  it("computes avgCompletion as mean of games with achievements, rounded to 1 decimal", () => {
    const games = [
      makeGame({ completion: 50, achievements: { earned: 5, total: 10 } }),
      makeGame({ completion: 75, achievements: { earned: 30, total: 40 } }),
    ];
    expect(computeStats(games).avgCompletion).toBe(62.5);
  });

  it("excludes games with 0 total achievements from avgCompletion", () => {
    const games = [
      makeGame({ completion: 0, achievements: { earned: 0, total: 0 } }),
      makeGame({ completion: 80, achievements: { earned: 8, total: 10 } }),
    ];
    expect(computeStats(games).avgCompletion).toBe(80);
  });

  it("returns 0 avgCompletion when no games have achievements", () => {
    expect(computeStats([]).avgCompletion).toBe(0);
    expect(
      computeStats([makeGame({ achievements: { earned: 0, total: 0 } })])
        .avgCompletion,
    ).toBe(0);
  });

  it("counts perfect games (earned >= total, total > 0)", () => {
    const games = [
      makeGame({ achievements: { earned: 10, total: 10 } }),
      makeGame({ achievements: { earned: 9, total: 10 } }),
      makeGame({ achievements: { earned: 0, total: 0 } }),
    ];
    expect(computeStats(games).perfectGames).toBe(1);
  });

  it("counts gamesOwned and gamesTracked", () => {
    const games = [
      makeGame({ owned: true, tracked: true }),
      makeGame({ owned: true, tracked: false }),
      makeGame({ owned: true, tracked: true }),
    ];
    const stats = computeStats(games);
    expect(stats.gamesOwned).toBe(3);
    expect(stats.gamesTracked).toBe(2);
  });

  it("achievementsEarnedDelta counts unlocks in the last 30 days", () => {
    const recentUnlock = Math.floor((NOW - 5 * 86400000) / 1000);
    const oldUnlock = Math.floor((NOW - 60 * 86400000) / 1000);
    const games = [
      makeGame({ unlocktimes: [recentUnlock, oldUnlock, recentUnlock] }),
    ];
    expect(computeStats(games).achievementsEarnedDelta).toBe(2);
  });

  it("avgCompletionDelta and gamesOwnedDelta are null (need snapshots)", () => {
    const stats = computeStats([makeGame()]);
    expect(stats.avgCompletionDelta).toBeNull();
    expect(stats.gamesOwnedDelta).toBeNull();
  });
});

// --- filterGames ---

describe("filterGames", () => {
  const games = [
    makeGame({ owned: true, tracked: true }),
    makeGame({ owned: true, tracked: false }),
    makeGame({ owned: true, tracked: true }),
  ];

  it("'all' returns all games", () => {
    expect(filterGames(games, "all")).toHaveLength(3);
  });

  it("'owned' returns all owned games", () => {
    expect(filterGames(games, "owned")).toHaveLength(3);
  });

  it("'tracked' returns only tracked games", () => {
    const tracked = filterGames(games, "tracked");
    expect(tracked).toHaveLength(2);
    expect(tracked.every((g) => g.tracked)).toBe(true);
  });
});

// --- meanGlobalPercent ---

describe("meanGlobalPercent", () => {
  it("returns 0 for empty array", () => {
    expect(meanGlobalPercent([])).toBe(0);
  });

  it("returns the mean rounded to 1 decimal", () => {
    const percentages: SteamGlobalAchievement[] = [
      { name: "a1", percent: 50 },
      { name: "a2", percent: 40 },
      { name: "a3", percent: 60 },
    ];
    expect(meanGlobalPercent(percentages)).toBe(50);
  });

  it("rounds to 1 decimal place", () => {
    const percentages: SteamGlobalAchievement[] = [
      { name: "a1", percent: 33.33 },
      { name: "a2", percent: 22.22 },
    ];
    expect(meanGlobalPercent(percentages)).toBe(27.8);
  });
});

// --- Exported constants ---

describe("exported constants", () => {
  it("DASHBOARD_FILTERS lists all/owned/tracked", () => {
    expect(DASHBOARD_FILTERS).toEqual(["all", "owned", "tracked"]);
  });
});

// --- Fixture-based tests (Steam API response shapes) ---

function getOwnedGamesFixtureGames() {
  const games = ownedGamesFixture.response.games;
  if (!games) throw new Error("Owned-games fixture must include its games array");
  return games;
}

describe("Steam fixtures - owned games", () => {
  it("contains 3 games with correct playtime", () => {
    const games = getOwnedGamesFixtureGames();
    expect(games).toHaveLength(3);
    expect(games[0]?.name).toBe("Elden Ring");
    expect(games[0]?.playtime_forever).toBe(7200);
  });

  it("private profile fixture has no games key", () => {
    expect("games" in privateProfileFixture.response).toBe(false);
  });

  it("empty games fixture has an empty games array", () => {
    expect("games" in emptyGamesFixture.response).toBe(true);
    expect(emptyGamesFixture.response.games).toHaveLength(0);
  });
});

describe("Steam fixtures - player achievements", () => {
  it("has 6 achievements, 4 achieved", () => {
    const achs = playerAchievementsFixture.playerstats.achievements;
    expect(achs).toHaveLength(6);
    expect(achs.filter((a) => a.achieved === 1)).toHaveLength(4);
  });

  it("achieved achievements have unlocktimes > 0", () => {
    const achieved = playerAchievementsFixture.playerstats.achievements.filter(
      (a) => a.achieved === 1,
    );
    expect(achieved.every((a) => a.unlocktime > 0)).toBe(true);
  });

  it("locked achievements have unlocktime 0", () => {
    const locked = playerAchievementsFixture.playerstats.achievements.filter(
      (a) => a.achieved === 0,
    );
    expect(locked.every((a) => a.unlocktime === 0)).toBe(true);
  });
});

describe("meanGlobalPercent with fixture data", () => {
  it("computes mean from the 6 global achievement percentages", () => {
    const percentages = globalAchievementsFixture.achievementpercentages.achievements;
    const result = meanGlobalPercent(percentages);
    const expected = (78.5 + 65.3 + 42.1 + 30.7 + 15.2 + 5.4) / 6;
    expect(result).toBe(Math.round(expected * 10) / 10);
  });
});

describe("computeStats with fixture-derived games", () => {
  it("computes stats from games built from Steam fixtures", () => {
    const unlocktimes = playerAchievementsFixture.playerstats.achievements
      .filter((a) => a.achieved === 1)
      .map((a) => a.unlocktime);

    const games: Game[] = getOwnedGamesFixtureGames().map((owned, i) => ({
      appId: owned.appid,
      name: owned.name,
      hours: Math.round(owned.playtime_forever / 60),
      completion: i === 0 ? 67 : i === 1 ? 100 : 50,
      achievements:
        i === 0
          ? { earned: 4, total: 6 }
          : i === 1
            ? { earned: 78, total: 78 }
            : { earned: 20, total: 40 },
      comparison: { text: "You're ahead of", percent: 40, isPositive: true },
      image: `https://cdn.cloudflare.steamstatic.com/steam/apps/${owned.appid}/header.jpg`,
      owned: true,
      tracked: i < 2,
      unlocktimes: i === 0 ? unlocktimes : [],
    }));

    const stats = computeStats(games);
    expect(stats.achievementsEarned).toBe(4 + 78 + 20);
    expect(stats.gamesOwned).toBe(3);
    expect(stats.gamesTracked).toBe(2);
    expect(stats.perfectGames).toBe(1);
    // 3 of 4 fixture unlocktimes fall within the last 30 days (the 40-day one is outside)
    expect(stats.achievementsEarnedDelta).toBe(3);
  });
});

// --- indexLetterOfName ---

describe("indexLetterOfName", () => {
  it("uppercases alphabetic initials", () => {
    expect(indexLetterOfName("portal")).toBe("P");
    expect(indexLetterOfName("Half-Life")).toBe("H");
  });

  it("groups non-alphabetic initials under #", () => {
    expect(indexLetterOfName("7 Days to Die")).toBe("#");
    expect(indexLetterOfName("")).toBe("#");
    expect(indexLetterOfName("  ")).toBe("#");
  });
});

// --- buildAlphabetIndex ---

describe("buildAlphabetIndex", () => {
  it("sorts trophy games by name and groups them by first letter", () => {
    const games = [
      makeGame({ appId: 2, name: "Portal" }),
      makeGame({ appId: 1, name: "Half-Life" }),
      makeGame({ appId: 3, name: "Half-Life 2" }),
    ];
    expect(buildAlphabetIndex(games)).toStrictEqual([
      {
        letter: "H",
        games: [
          expect.objectContaining({ name: "Half-Life" }),
          expect.objectContaining({ name: "Half-Life 2" }),
        ],
      },
      { letter: "P", games: [expect.objectContaining({ name: "Portal" })] },
    ]);
  });

  it("leaves games without achievements off the index", () => {
    const games = [
      makeGame({ name: "No Trophies", achievements: { earned: 0, total: 0 } }),
      makeGame({ name: "Portal" }),
    ];
    const index = buildAlphabetIndex(games);
    expect(index).toHaveLength(1);
    expect(index[0]?.letter).toBe("P");
  });

  it("returns an empty index when no game has achievements", () => {
    expect(
      buildAlphabetIndex([
        makeGame({ achievements: { earned: 0, total: 0 } }),
      ]),
    ).toStrictEqual([]);
  });
});
