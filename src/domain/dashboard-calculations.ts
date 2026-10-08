import type { EarnedEntry, GameAchievementCacheEntry } from "./library.ts";
import type {
  Game,
  GameAchievement,
  GameFilter,
  RarityTier,
  Stats,
  SteamGlobalAchievement,
} from "../../lib/types.ts";

/** Achievement totals and unlock data needed to build a dashboard game row. */
export interface GameEnrichment {
  /** Player-earned and total achievement counts from Steam. */
  readonly achievements: {
    readonly earned: number;
    readonly total: number;
  };
  /** Unix-second timestamps of the player's earned achievements. */
  readonly unlocktimes: ReadonlyArray<number>;
  /** Mean community completion percentage for the game's achievements. */
  readonly communityAvg: number;
}

/** One earned achievement attributed to a game. */
export interface EarnedAchievementSummary {
  readonly apiname: string;
  readonly unlocktime: number;
  readonly globalPercent: number;
}

/**
 * Reduce raw cached Steam achievement data into the numbers the dashboard
 * renders, including the per-game community average.
 *
 * @param entry - Player achievements and global percentages for one game.
 * @returns Achievement totals, unlock times, community average, and earned entries.
 */
export function summarizeAchievementData(
  entry: GameAchievementCacheEntry,
): GameEnrichment & { readonly earnedEntries: ReadonlyArray<EarnedAchievementSummary> } {
  const earned = entry.achievements.filter((a) => a.achieved === 1).length;

  const unlocktimes = entry.achievements
    .filter((a) => a.achieved === 1 && a.unlocktime > 0)
    .map((a) => a.unlocktime);

  const percentByApiName = new Map<string, number>();

  for (const percentage of entry.globalPercentages) {
    percentByApiName.set(percentage.name, percentage.percent);
  }

  const earnedEntries = entry.achievements
    .filter((a) => a.achieved === 1 && a.unlocktime > 0)
    .map((a) => ({
      apiname: a.apiname,
      unlocktime: a.unlocktime,
      globalPercent: percentByApiName.get(a.apiname) ?? 0,
    }));

  return {
    achievements: { earned, total: entry.achievements.length },
    unlocktimes,
    communityAvg: meanGlobalPercent(entry.globalPercentages),
    earnedEntries,
  };
}

/** Return the games matching the selected library filter. */
export function filterGames(games: ReadonlyArray<Game>, filter: GameFilter): ReadonlyArray<Game> {
  switch (filter) {
    case "owned":
      return games.filter((game) => game.owned);
    case "tracked":
      return games.filter((game) => game.tracked);
    case "all":
      return games;
  }
}

/** How to order games within each letter group on the achievements overview. */
export type AchievementGameSort = "name" | "remaining" | "completion";

/** Which achievements to show on a game's detail page. */
export type GameAchievementFilter = "all" | "unlocked" | "locked";

/** How to order a game's filtered achievements. */
export type GameAchievementSort = "rarity" | "name" | "recent";

/**
 * Search and sort achievements for one game without mutating the source list.
 * Rarity sorts by ascending Steam global percentage; recent sorts by newest unlock time.
 */
export function filterAndSortGameAchievements(
  achievements: ReadonlyArray<GameAchievement>,
  filter: GameAchievementFilter,
  query: string,
  sort: GameAchievementSort,
): ReadonlyArray<GameAchievement> {
  const search = query.trim().toLowerCase();

  const filtered = achievements.filter((achievement) => {
    if (filter === "unlocked" && !achievement.achieved) return false;

    if (filter === "locked" && achievement.achieved) return false;

    if (!search) return true;

    return (
      achievement.name.toLowerCase().includes(search) ||
      achievement.description.toLowerCase().includes(search)
    );
  });

  return filtered.toSorted((left, right) => {
    if (sort === "rarity") {
      return left.globalPercent - right.globalPercent || left.name.localeCompare(right.name);
    }

    if (sort === "recent") {
      return right.unlocktime - left.unlocktime || left.name.localeCompare(right.name);
    }

    return left.name.localeCompare(right.name);
  });
}

/** Sort one letter group by name, trophies remaining, or completion percentage. */
export function sortAchievementGames(
  games: ReadonlyArray<Game>,
  sort: AchievementGameSort,
): ReadonlyArray<Game> {
  return games.toSorted((left, right) => {
    if (sort === "remaining") {
      const remainingDifference =
        left.achievements.total -
        left.achievements.earned -
        (right.achievements.total - right.achievements.earned);

      return (
        remainingDifference ||
        right.completion - left.completion ||
        left.name.localeCompare(right.name)
      );
    }

    if (sort === "completion") {
      return right.completion - left.completion || left.name.localeCompare(right.name);
    }

    return left.name.localeCompare(right.name);
  });
}

/** Check exact achievement counts instead of rounded game completion percentages. */
export function hasEarnedAllGameAchievements(game: Game): boolean {
  return game.achievements.total > 0 && game.achievements.earned >= game.achievements.total;
}

/** Compute aggregate achievement and library statistics at a supplied time. */
export function computeStats(games: ReadonlyArray<Game>, nowMs: number): Stats {
  const gamesWithAchievements = games.filter((game) => game.achievements.total > 0);

  const achievementsEarned = games.reduce((sum, game) => sum + game.achievements.earned, 0);

  const avgCompletion =
    gamesWithAchievements.length === 0
      ? 0
      : Math.round(
          (gamesWithAchievements.reduce((sum, game) => sum + game.completion, 0) /
            gamesWithAchievements.length) *
            10,
        ) / 10;

  const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;

  const recentUnlocks = games.reduce(
    (sum, game) => sum + game.unlocktimes.filter((time) => time * 1000 >= thirtyDaysAgo).length,
    0,
  );

  return {
    achievementsEarned,
    achievementsEarnedDelta: recentUnlocks,
    avgCompletion: Number.isNaN(avgCompletion) ? 0 : avgCompletion,
    avgCompletionDelta: null,
    gamesOwned: games.filter((game) => game.owned).length,
    gamesOwnedDelta: null,
    gamesTracked: games.filter((game) => game.tracked).length,
    perfectGames: games.filter(hasEarnedAllGameAchievements).length,
  };
}

/** Calculate the mean Steam community achievement completion percentage. */
export function meanGlobalPercent(percentages: ReadonlyArray<SteamGlobalAchievement>): number {
  if (percentages.length === 0) return 0;
  const sum = percentages.reduce((total, achievement) => total + achievement.percent, 0);
  const mean = Math.round((sum / percentages.length) * 10) / 10;

  return Number.isNaN(mean) ? 0 : mean;
}

/** Build a display-ready game row from owned-game and achievement data. */
export function buildGame(
  appId: number,
  name: string,
  playtimeMinutes: number,
  data: GameEnrichment,
  image: string,
): Game {
  const completion =
    data.achievements.total === 0
      ? 0
      : Math.round((data.achievements.earned / data.achievements.total) * 100);

  const safeCompletion = Number.isNaN(completion) ? 0 : completion;

  const safeCommunityAvg = Number.isNaN(data.communityAvg) ? 0 : data.communityAvg;

  const communityPct = Math.round(safeCommunityAvg * 10) / 10;
  const isPositive = safeCompletion >= safeCommunityAvg;

  return {
    appId,
    name,
    hours: Math.round(playtimeMinutes / 60),
    completion: safeCompletion,
    achievements: data.achievements,
    comparison: {
      text: isPositive ? "You're ahead of" : "You're behind",
      percent: Number.isNaN(communityPct) ? 0 : communityPct,
      isPositive,
    },
    image,
    owned: true,
    tracked: false,
    unlocktimes: [...data.unlocktimes],
  };
}

/** First index letter for a game name; non A–Z initials group under `#`. */
export function indexLetterOfName(name: string): string {
  const first = name.trim().charAt(0).toUpperCase();

  return first >= "A" && first <= "Z" ? first : "#";
}

/** One letter group in the achievements A–Z index. */
export interface AlphabetIndexGroup {
  /** Group key: `A`–`Z`, or `#` for non-alphabetic initials. */
  readonly letter: string;
  /** Trophy games in this group, sorted by name. */
  readonly games: ReadonlyArray<Game>;
}

/**
 * Build the achievements A–Z index: trophy games sorted by name and grouped
 * by first letter. Games without achievements stay off the index.
 *
 * @param games - Library games from the achievements overview read model.
 * @returns Letter groups sorted alphabetically, each holding sorted games.
 */
export function buildAlphabetIndex(games: ReadonlyArray<Game>): ReadonlyArray<AlphabetIndexGroup> {
  const sorted = [...games]
    .filter((game) => game.achievements.total > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  const groups = new Map<string, Array<Game>>();

  for (const game of sorted) {
    const letter = indexLetterOfName(game.name);
    const list = groups.get(letter) ?? [];
    list.push(game);
    groups.set(letter, list);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, list]) => ({ letter, games: list }));
}

const RARITY_TIERS = [
  { tier: "Common", min: 50, max: 100.1, color: "var(--muted-foreground)" },
  { tier: "Uncommon", min: 25, max: 50, color: "var(--color-green-400)" },
  { tier: "Rare", min: 10, max: 25, color: "var(--color-blue-400)" },
  { tier: "Very Rare", min: 5, max: 10, color: "var(--color-purple-400)" },
  { tier: "Ultra Rare", min: 0, max: 5, color: "var(--color-amber-400)" },
] as const;

/** Count earned achievements into the existing rarity chart buckets. */
export function computeRarityDistribution(
  earnedEntries: ReadonlyArray<EarnedEntry>,
): ReadonlyArray<RarityTier> {
  const counts = RARITY_TIERS.map((tier) => ({ ...tier, count: 0 }));

  for (const entry of earnedEntries) {
    const percentage = entry.globalPercent ?? 0;

    for (const tier of counts) {
      if (percentage >= tier.min && percentage < tier.max) {
        tier.count += 1;
        break;
      }
    }
  }

  return counts.map(({ tier, count, color }) => ({ tier, count, color }));
}
