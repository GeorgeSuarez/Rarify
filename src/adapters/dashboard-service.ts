import * as Clock from "effect/Clock";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  type AppId,
  AppIdSchema,
  type DashboardData,
  type DashboardError,
  type Game,
  type GameAchievement,
  type GameFilter,
  type RecentAchievement,
  type Stats,
  type SteamId,
  type UserProfile,
} from "../../lib/types.ts";
import {
  buildGame,
  computeRarityDistribution,
  computeStats,
  summarizeAchievementData,
} from "../domain/dashboard-calculations.ts";
import { getGameHeaderImage } from "../domain/game-images.ts";
import {
  GAME_ACHIEVEMENT_CACHE_TTL_MS,
  isSnapshotFresh,
  type EarnedEntry,
  type GameAchievementCacheEntry,
  type GameAchievementSchemaValue,
  type PersistedSnapshot,
} from "../domain/library.ts";
import type {
  AchievementsOverview,
  FriendComparison,
  FriendSummary,
  FriendsData,
  GameAchievements,
} from "../domain/dashboard.ts";
import * as Dashboard from "../services/dashboard.ts";
import * as RarifyStore from "../services/rarify-store.ts";
import * as SteamClient from "../services/steam-client.ts";

const DETAIL_CONCURRENCY = 5;

const RECENT_ACHIEVEMENT_COUNT = 5;

/**
 * Default number of games enriched with live Steam reads per invocation.
 *
 * Each game costs two Steam subrequests, and Cloudflare caps a Worker
 * invocation at 50 subrequests on the free plan (1000 on paid). The rest of
 * the library fills in from the per-game D1 cache on later loads. Set
 * `ENRICH_BATCH_SIZE` higher after upgrading to Workers Paid.
 */
const DEFAULT_ENRICH_BATCH_SIZE = 20;

interface FetchedGameAchievements {
  readonly appId: AppId;
  readonly entry: GameAchievementCacheEntry;
}

const emptyPersisted = {
  games: [],
  earnedEntries: [],
} as const satisfies Omit<PersistedSnapshot, "version" | "fetchedAtMs">;

function emptyStats(): Stats {
  return {
    achievementsEarned: 0,
    achievementsEarnedDelta: 0,
    avgCompletion: 0,
    avgCompletionDelta: null,
    gamesOwned: 0,
    gamesOwnedDelta: null,
    gamesTracked: 0,
    perfectGames: 0,
  };
}

/** Build the application-owned dashboard read model implementation. */
export const make: Effect.Effect<
  Dashboard.Interface,
  Config.ConfigError,
  SteamClient.Service | RarifyStore.Service
> = Effect.gen(function* () {
  const steam = yield* SteamClient.Service;
  const store = yield* RarifyStore.Service;

  const enrichBatchSize = yield* Config.Int("ENRICH_BATCH_SIZE").pipe(
    Config.withDefault(DEFAULT_ENRICH_BATCH_SIZE),
  );

  const profileOf = (
    profile: Option.Option<UserProfile>,
  ): { readonly personaName: string; readonly avatar: string } | undefined =>
    Option.match(profile, {
      onNone: () => undefined,
      onSome: (value) => ({
        personaName: value.personaName,
        avatar: value.avatar,
      }),
    });

  const fetchGameAchievementData = Effect.fn("DashboardService.fetchGameAchievementData")(
    function* (steamId: SteamId, appId: AppId) {
      const [achievements, globalPercentages] = yield* Effect.all(
        [steam.getPlayerAchievements(steamId, appId), steam.getGlobalAchievementPercentages(appId)],
        { concurrency: "unbounded" },
      );

      return {
        achievements,
        globalPercentages,
      } satisfies GameAchievementCacheEntry;
    },
  );

  /**
   * Read achievement display metadata through the global schema cache.
   *
   * Schemas are identical for every account, so one cached row serves all
   * users and a dashboard load only touches Steam for stale or unseen games.
   * A game whose schema fetch fails resolves to an empty map — and that miss
   * is cached too, so a game without Steam stats never fails or refetches
   * within the TTL. This resolver never fails the request.
   */
  const resolveGameSchemas = Effect.fn("DashboardService.resolveGameSchemas")(function* (
    appIds: ReadonlyArray<AppId>,
  ) {
    const resolved = new Map<number, ReadonlyMap<string, GameAchievementSchemaValue>>();

    if (appIds.length === 0) return resolved;

    const nowMs = yield* Clock.currentTimeMillis;

    const cached = yield* store
      .getGameSchemaCache(appIds)
      .pipe(
        Effect.catchTag("PersistenceError", (error) =>
          Effect.logWarning("Schema cache read failed; refetching").pipe(
            Effect.annotateLogs({ operation: error.operation }),
            Effect.as(new Map<number, RarifyStore.GameSchemaCacheRead>()),
          ),
        ),
      );

    for (const [appId, read] of cached) {
      resolved.set(appId, new Map(Object.entries(read.schema)));
    }

    const stale = appIds.filter((appId) => {
      const read = cached.get(appId);

      return read === undefined || nowMs - read.fetchedAtMs >= GAME_ACHIEVEMENT_CACHE_TTL_MS;
    });

    const fetched = yield* Effect.forEach(
      stale,
      (appId) =>
        steam.getGameAchievementSchema(appId).pipe(
          Effect.map((schema) => ({
            appId,
            // The Steam adapter leaves display fields optional; normalize
            // here so the cached rows always carry complete strings.
            schema: Object.fromEntries(
              [...schema].map(([name, value]) => [
                name,
                {
                  displayName: value.displayName ?? name,
                  description: value.description ?? "",
                  icon: value.icon ?? "",
                  icongray: value.icongray ?? "",
                },
              ]),
            ),
          })),
          Effect.catchTag("SteamApiError", (error) =>
            Effect.logWarning("Skipping Steam schema fetch for one game", error).pipe(
              Effect.annotateLogs({
                appId: String(appId),
                operation: error.operation,
                errorTag: error._tag,
              }),
              Effect.as({ appId, schema: {} }),
            ),
          ),
        ),
      { concurrency: DETAIL_CONCURRENCY },
    );

    if (fetched.length > 0) {
      yield* store
        .saveGameSchemaCache(
          fetched.map(({ appId, schema }) => ({
            appId,
            schema,
            fetchedAtMs: nowMs,
          })),
        )
        .pipe(
          Effect.catchTag("PersistenceError", (error) =>
            Effect.logWarning("Schema cache write failed; continuing").pipe(
              Effect.annotateLogs({ operation: error.operation }),
            ),
          ),
        );
    }

    for (const { appId, schema } of fetched) {
      resolved.set(appId, new Map(Object.entries(schema)));
    }

    return resolved;
  });

  const enrichLibraryFromSteam = Effect.fn("DashboardService.enrichLibraryFromSteam")(function* (
    steamId: SteamId,
  ) {
    const owned = yield* steam.getOwnedGames(steamId);

    if (!owned.ok) {
      return {
        persisted: null,
        error:
          owned.status === null
            ? ({ type: owned.reason } satisfies DashboardError)
            : ({ type: owned.reason, status: owned.status } satisfies DashboardError),
      } as const;
    }

    if (owned.games.length === 0) {
      return { persisted: emptyPersisted, error: null } as const;
    }

    const sorted = [...owned.games].sort((a, b) => b.playtime_forever - a.playtime_forever);

    const detailedSlice = sorted.filter(
      (game) => game.playtime_forever > 0 && game.has_community_visible_stats,
    );

    const nowMs = yield* Clock.currentTimeMillis;

    const cached = yield* store
      .getGameAchievementCache(steamId)
      .pipe(
        Effect.catchTag("PersistenceError", (error) =>
          Effect.logWarning("Achievement cache read failed; refetching").pipe(
            Effect.annotateLogs({ operation: error.operation }),
            Effect.as(new Map<number, RarifyStore.GameAchievementCacheRead>()),
          ),
        ),
      );

    const staleGames = detailedSlice.filter((game) => {
      const cachedEntry = cached.get(game.appid);

      return (
        cachedEntry === undefined ||
        nowMs - cachedEntry.fetchedAtMs >= GAME_ACHIEVEMENT_CACHE_TTL_MS
      );
    });

    // Bound Steam calls per invocation so the Worker stays inside Cloudflare's
    // subrequest budget; remaining games fill in on later loads.
    const batch = staleGames.slice(0, enrichBatchSize);

    const fetched = yield* Effect.forEach(
      batch,
      (game) => {
        const appId = parseAppId(game.appid);

        if (appId === null) return Effect.succeed(Option.none<FetchedGameAchievements>());

        return fetchGameAchievementData(steamId, appId).pipe(
          Effect.map((entry) => Option.some({ appId, entry })),
          Effect.catchTag("SteamApiError", (error) =>
            Effect.logWarning("Skipping Steam enrichment for one game", error).pipe(
              Effect.annotateLogs({
                appId: String(game.appid),
                operation: error.operation,
                errorTag: error._tag,
              }),
              Effect.as(Option.none<FetchedGameAchievements>()),
            ),
          ),
        );
      },
      { concurrency: DETAIL_CONCURRENCY },
    );

    const fetchedEntries = fetched.flatMap((result) =>
      Option.isSome(result) ? [result.value] : [],
    );

    yield* store
      .saveGameAchievementCache(
        steamId,
        fetchedEntries.map(({ appId, entry }) => ({
          appId,
          entry,
          fetchedAtMs: nowMs,
        })),
      )
      .pipe(
        Effect.catchTag("PersistenceError", (error) =>
          Effect.logWarning("Achievement cache write failed; continuing").pipe(
            Effect.annotateLogs({ operation: error.operation }),
          ),
        ),
      );

    const entryByAppId = new Map<number, GameAchievementCacheEntry>(
      [...cached.entries()].map(([appId, read]) => [appId, read.entry]),
    );

    for (const { appId, entry } of fetchedEntries) {
      entryByAppId.set(appId, entry);
    }

    const nameByAppId = new Map<number, string>(sorted.map((game) => [game.appid, game.name]));

    const games: ReadonlyArray<Game> = sorted
      .map((game) => {
        const entry = entryByAppId.get(game.appid);

        if (entry === undefined) {
          return {
            appId: game.appid,
            name: game.name,
            hours: Math.round(game.playtime_forever / 60),
            completion: 0,
            achievements: { earned: 0, total: 0 },
            comparison: { text: "No data", percent: 0, isPositive: false },
            image: getGameHeaderImage(game.appid),
            owned: true,
            tracked: false,
            unlocktimes: [],
          } satisfies Game;
        }

        const summary = summarizeAchievementData(entry);

        return buildGame(
          game.appid,
          game.name,
          game.playtime_forever,
          summary,
          getGameHeaderImage(game.appid),
        );
      })
      .sort((a, b) => b.hours - a.hours);

    const earnedEntries: ReadonlyArray<EarnedEntry> = [...entryByAppId.entries()].flatMap(
      ([appId, entry]) =>
        summarizeAchievementData(entry).earnedEntries.map((earned) => ({
          appId,
          gameName: nameByAppId.get(appId) ?? `App ${appId}`,
          ...earned,
        })),
    );

    return {
      persisted: { games, earnedEntries },
      error: null,
    } as const;
  });

  const readProfile = Effect.fn("DashboardService.readProfile")(function* (steamId: SteamId) {
    return yield* store
      .getUserProfile(steamId)
      .pipe(
        Effect.catchTag("PersistenceError", (error) =>
          Effect.logWarning("User profile read failed; continuing without it").pipe(
            Effect.annotateLogs({ operation: error.operation }),
            Effect.as(Option.none<UserProfile>()),
          ),
        ),
      );
  });

  const readTrackedAppIds = Effect.fn("DashboardService.readTrackedAppIds")(function* (
    steamId: SteamId,
  ) {
    return yield* store
      .getTrackedAppIds(steamId)
      .pipe(
        Effect.catchTag("PersistenceError", (error) =>
          Effect.logWarning("Tracked-game read failed; continuing without it").pipe(
            Effect.annotateLogs({ operation: error.operation }),
            Effect.as([] satisfies ReadonlyArray<AppId>),
          ),
        ),
      );
  });

  /**
   * Overlay the account's pinned games onto a cached library.
   *
   * Tracked state is user data, not Steam data, so it is never written to the
   * cache and must be applied on every read.
   */
  const withTrackedGames = Effect.fn("DashboardService.withTrackedGames")(function* (
    steamId: SteamId,
    persisted: Omit<PersistedSnapshot, "version" | "fetchedAtMs">,
  ) {
    const trackedAppIds = yield* readTrackedAppIds(steamId);
    // Compare against the numeric game IDs stored in the cached library.
    const trackedSet = new Set<number>(trackedAppIds);

    return {
      ...persisted,
      games: persisted.games.map((game) => ({
        ...game,
        tracked: trackedSet.has(game.appId),
      })),
    };
  });

  const toLibrarySnapshot = Effect.fn("DashboardService.toLibrarySnapshot")(
    (
      _steamId: SteamId,
      persisted: Omit<PersistedSnapshot, "version" | "fetchedAtMs">,
      error: DashboardError,
    ) =>
      Effect.succeed(
        // Optional response keys are omitted rather than set to `undefined`,
        // which keeps the JSON wire shape valid for `optionalKey` schemas.
        persisted.user === undefined
          ? { games: persisted.games, earnedEntries: persisted.earnedEntries, error }
          : {
              games: persisted.games,
              earnedEntries: persisted.earnedEntries,
              error,
              user: persisted.user,
            },
      ),
  );

  /** Read the cache without fetching Steam, preserving error information. */
  const readLibrary = Effect.fn("DashboardService.readLibrary")(function* (steamId: SteamId) {
    const cached = yield* store
      .getCachedLibrary(steamId)
      .pipe(
        Effect.catchTag("PersistenceError", (error) =>
          Effect.logWarning("Library cache read failed; continuing without it").pipe(
            Effect.annotateLogs({ operation: error.operation }),
            Effect.as(Option.none<PersistedSnapshot>()),
          ),
        ),
      );

    const nowMs = yield* Clock.currentTimeMillis;
    const cachedValue = Option.getOrNull(cached);

    if (cachedValue !== null && isSnapshotFresh(cachedValue.fetchedAtMs, nowMs)) {
      return { persisted: yield* withTrackedGames(steamId, cachedValue), error: null } as const;
    }

    const outcome = yield* enrichLibraryFromSteam(steamId);

    if (outcome.error !== null) {
      if (cachedValue !== null) {
        return { persisted: yield* withTrackedGames(steamId, cachedValue), error: null } as const;
      }

      return { persisted: emptyPersisted, error: outcome.error } as const;
    }

    yield* store
      .saveCachedLibrary(steamId, outcome.persisted, nowMs)
      .pipe(
        Effect.catchTag("PersistenceError", (error) =>
          Effect.logWarning("Library cache write failed; continuing").pipe(
            Effect.annotateLogs({ operation: error.operation }),
          ),
        ),
      );

    return { persisted: yield* withTrackedGames(steamId, outcome.persisted), error: null } as const;
  });

  const getLibrary = Effect.fn("DashboardService.getLibrary")(function* (steamId) {
    const read = yield* readLibrary(steamId);
    const profile = yield* readProfile(steamId);

    const withProfile = Option.isSome(profile)
      ? { ...read.persisted, user: profile.value }
      : read.persisted;

    return yield* toLibrarySnapshot(steamId, withProfile, read.error);
  });

  const getDashboard = Effect.fn("DashboardService.getDashboard")(function* (
    steamId,
    filter: GameFilter,
  ) {
    const read = yield* readLibrary(steamId);
    const profile = yield* readProfile(steamId);

    if (read.error !== null) {
      return {
        stats: emptyStats(),
        games: [],
        recentAchievements: [],
        rarestAchievements: [],
        rarityDistribution: [],
        error: read.error,
      } satisfies DashboardData;
    }

    const games = read.persisted.games.filter((game) => {
      if (filter === "owned") return game.owned;

      if (filter === "tracked") return game.tracked;

      return true;
    });

    const nowMs = yield* Clock.currentTimeMillis;
    const computedStats = computeStats(games, nowMs);

    const [recentAchievements, rarestAchievements, previousSnapshot] = yield* Effect.all(
      [
        enrichEntries(resolveGameSchemas, read.persisted.earnedEntries, {
          sort: "recent",
          limit: RECENT_ACHIEVEMENT_COUNT,
        }),
        enrichEntries(resolveGameSchemas, read.persisted.earnedEntries, {
          sort: "rarest",
          limit: RECENT_ACHIEVEMENT_COUNT,
        }),
        store.getPreviousSnapshot(steamId, isoDate(nowMs)),
      ],
      { concurrency: "unbounded" },
    );

    const stats = Option.match(previousSnapshot, {
      onNone: () => computedStats,
      onSome: (previous) => ({
        ...computedStats,
        avgCompletionDelta:
          Math.round((computedStats.avgCompletion - previous.avgCompletion) * 10) / 10,
        gamesOwnedDelta: computedStats.gamesOwned - previous.gamesOwned,
      }),
    });

    const user = profileOf(profile);

    return user === undefined
      ? ({
          stats,
          games,
          recentAchievements,
          rarestAchievements,
          rarityDistribution: computeRarityDistribution(read.persisted.earnedEntries),
          error: null,
        } satisfies DashboardData)
      : ({
          stats,
          games,
          recentAchievements,
          rarestAchievements,
          rarityDistribution: computeRarityDistribution(read.persisted.earnedEntries),
          error: null,
          user,
        } satisfies DashboardData);
  });

  const getAchievementsOverview = Effect.fn("DashboardService.getAchievementsOverview")(
    function* (steamId) {
      const read = yield* readLibrary(steamId);
      const profile = yield* readProfile(steamId);

      if (read.error !== null) {
        return {
          stats: emptyStats(),
          games: [],
          recentAchievements: [],
          rarestAchievements: [],
          rarestPerGame: [],
          error: read.error,
          user: profileOf(profile),
        } satisfies AchievementsOverview;
      }

      const games = read.persisted.games;
      const nowMs = yield* Clock.currentTimeMillis;
      const stats = computeStats(games, nowMs);

      // Select everything this page renders before touching I/O: the per-game
      // rarest entries come from a single in-memory index, and every selection
      // shares one batched schema resolution instead of one round-trip per game.
      const recentSelection = selectEntries(read.persisted.earnedEntries, {
        sort: "recent",
        limit: 20,
      });

      const rarestSelection = selectEntries(read.persisted.earnedEntries, {
        sort: "rarest",
        limit: 10,
      });

      const entriesByAppId = indexEntriesByAppId(read.persisted.earnedEntries);
      const perGameRarest: Array<{ readonly game: Game; readonly rarest: EarnedEntry }> = [];

      for (const game of games) {
        if (game.achievements.total === 0) continue;
        const candidates = entriesByAppId.get(game.appId) ?? [];
        let rarest: EarnedEntry | undefined;

        for (const entry of candidates) {
          if (
            entry.globalPercent > 0 &&
            (rarest === undefined || entry.globalPercent < rarest.globalPercent)
          ) {
            rarest = entry;
          }
        }

        if (rarest !== undefined) perGameRarest.push({ game, rarest });
      }

      const perGameAppIds = perGameRarest.flatMap(({ rarest }) => {
        const appId = parseAppId(rarest.appId);

        return appId === null ? [] : [appId];
      });

      const schemaByAppId = yield* resolveGameSchemas([
        ...new Set([...recentSelection.appIds, ...rarestSelection.appIds, ...perGameAppIds]),
      ]);

      const recentAchievements = renderEntries(schemaByAppId, recentSelection.top);
      const rarestAchievements = renderEntries(schemaByAppId, rarestSelection.top);

      const rarestPerGame = perGameRarest.flatMap(({ game, rarest }) => {
        const [achievement] = renderEntries(schemaByAppId, [rarest]);

        return achievement === undefined
          ? []
          : [{ appId: game.appId, gameName: game.name, achievement }];
      });

      const user = profileOf(profile);

      return user === undefined
        ? ({
            stats,
            games,
            recentAchievements,
            rarestAchievements,
            rarestPerGame,
            error: null,
          } satisfies AchievementsOverview)
        : ({
            stats,
            games,
            recentAchievements,
            rarestAchievements,
            rarestPerGame,
            error: null,
            user,
          } satisfies AchievementsOverview);
    },
  );

  const getGameAchievements = Effect.fn("DashboardService.getGameAchievements")(
    function* (steamId, appId) {
      const [achievements, percentages, owned] = yield* Effect.all(
        [
          steam.getPlayerAchievements(steamId, appId),
          steam.getGlobalAchievementPercentages(appId),
          steam.getOwnedGames(steamId),
        ],
        { concurrency: "unbounded" },
      );

      if (achievements.length === 0) {
        return {
          gameName: "",
          gameImage: getGameHeaderImage(appId),
          appId,
          hours: 0,
          totalAchievements: 0,
          earnedAchievements: 0,
          completion: 0,
          achievements: [],
          error: null,
        } satisfies GameAchievements;
      }

      const percentByApiName = new Map<string, number>();

      for (const percentage of percentages) {
        percentByApiName.set(percentage.name, percentage.percent);
      }

      const ownedGame = owned.ok ? owned.games.find((game) => game.appid === appId) : undefined;

      const schemas = yield* resolveGameSchemas([appId]);
      const schema = schemas.get(appId) ?? new Map();
      const earnedCount = achievements.filter((a) => a.achieved === 1).length;

      const rows: ReadonlyArray<GameAchievement> = achievements.map((achievement) => {
        const metadata = schema.get(achievement.apiname);

        return {
          apiname: achievement.apiname,
          name: metadata?.displayName ?? achievement.apiname,
          description: metadata?.description ?? "",
          icon: metadata?.icon ?? "",
          icongray: metadata?.icongray ?? "",
          achieved: achievement.achieved === 1,
          unlocktime: achievement.unlocktime,
          globalPercent: percentByApiName.get(achievement.apiname) ?? 0,
        };
      });

      return {
        gameName: ownedGame?.name ?? "",
        gameImage: getGameHeaderImage(appId),
        appId,
        hours: ownedGame === undefined ? 0 : Math.round(ownedGame.playtime_forever / 60),
        totalAchievements: achievements.length,
        earnedAchievements: earnedCount,
        completion: Math.round((earnedCount / achievements.length) * 100),
        achievements: rows,
        error: null,
      } satisfies GameAchievements;
    },
  );

  const getFriends = Effect.fn("DashboardService.getFriends")(function* (steamId) {
    const friendIds = yield* steam.getFriendIds(steamId);

    if (friendIds.length === 0) {
      return { friends: [], error: null, hiddenCount: 0 } satisfies FriendsData;
    }

    const summaries = yield* steam.getPlayerSummaries(friendIds);

    const accessibility = yield* Effect.forEach(
      friendIds,
      (friendId) =>
        steam.getOwnedGames(friendId).pipe(
          Effect.map((result) => Option.some({ friendId, accessible: result.ok })),
          Effect.catchTag("SteamApiError", () =>
            Effect.succeed(Option.none<{ friendId: SteamId; accessible: boolean }>()),
          ),
        ),
      { concurrency: DETAIL_CONCURRENCY },
    );

    const accessibleIds = new Set(
      accessibility.flatMap((result) =>
        Option.isSome(result) && result.value.accessible ? [result.value.friendId] : [],
      ),
    );

    const friends: ReadonlyArray<FriendSummary> = summaries.flatMap((summary) =>
      accessibleIds.has(summary.steamId)
        ? [
            {
              steamId: summary.steamId,
              name: summary.personaName,
              avatar: summary.avatar,
              avatarFull: summary.avatarFull,
              profileUrl: summary.profileUrl,
            },
          ]
        : [],
    );

    return {
      friends,
      error: null,
      hiddenCount: summaries.length - friends.length,
    } satisfies FriendsData;
  });

  const getFriendComparison = Effect.fn("DashboardService.getFriendComparison")(
    function* (steamId, friendSteamId) {
      const [yourData, friendData, friends] = yield* Effect.all(
        [getDashboard(steamId, "all"), getDashboard(friendSteamId, "all"), getFriends(steamId)],
        { concurrency: "unbounded" },
      );

      const friendInfo = friends.friends.find((friend) => friend.steamId === friendSteamId);

      return friendInfo === undefined
        ? ({ yourData, friendData } satisfies FriendComparison)
        : ({ yourData, friendData, friendInfo } satisfies FriendComparison);
    },
  );

  return Dashboard.Service.of({
    getDashboard,
    getLibrary,
    getAchievementsOverview,
    getGameAchievements,
    getFriends,
    getFriendComparison,
  });
});

function isoDate(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/**
 * Parse an application ID received from Steam into the domain identifier.
 *
 * @param value - Raw numeric application ID from a Steam payload.
 * @returns The branded identifier, or `null` when Steam returned an invalid value.
 */
function parseAppId(value: number): AppId | null {
  return Option.getOrNull(Schema.decodeUnknownOption(AppIdSchema)(value));
}

type EnrichmentSort = "recent" | "rarest" | "as-is";

interface EnrichmentOptions {
  readonly sort: EnrichmentSort;
  readonly limit: number;
}

interface SelectedEntries {
  readonly top: ReadonlyArray<EarnedEntry>;
  readonly appIds: ReadonlyArray<AppId>;
}

/**
 * Select display entries and their game IDs without performing any I/O, so
 * callers can union the IDs from several selections into one batched fetch.
 */
function selectEntries(
  entries: ReadonlyArray<EarnedEntry>,
  options: EnrichmentOptions,
): SelectedEntries {
  let selected: ReadonlyArray<EarnedEntry>;

  if (options.sort === "rarest") {
    selected = [...entries]
      .filter((entry) => entry.globalPercent > 0)
      .sort((a, b) => a.globalPercent - b.globalPercent);
  } else if (options.sort === "recent") {
    selected = [...entries].sort((a, b) => b.unlocktime - a.unlocktime);
  } else {
    selected = [...entries];
  }

  const top = selected.slice(0, options.limit);

  const appIds = [...new Set(top.map((entry) => entry.appId))].flatMap((appId) => {
    const parsed = parseAppId(appId);

    return parsed === null ? [] : [parsed];
  });

  return { top, appIds };
}

/** Render selected entries against already-resolved schemas (pure). */
function renderEntries(
  schemaByAppId: ReadonlyMap<number, ReadonlyMap<string, GameAchievementSchemaValue>>,
  top: ReadonlyArray<EarnedEntry>,
): ReadonlyArray<RecentAchievement> {
  return top.map((entry) => {
    const schema = schemaByAppId.get(entry.appId)?.get(entry.apiname);

    const base = {
      appId: entry.appId,
      gameName: entry.gameName,
      gameImage: getGameHeaderImage(entry.appId),
      name: schema?.displayName ?? entry.apiname,
      unlocktime: entry.unlocktime,
      globalPercent: entry.globalPercent,
    };

    return schema === undefined
      ? (base satisfies RecentAchievement)
      : ({
          ...base,
          description: schema.description,
          icon: schema.icon,
        } satisfies RecentAchievement);
  });
}

/** Group earned entries by game in one pass for per-game selections. */
function indexEntriesByAppId(
  entries: ReadonlyArray<EarnedEntry>,
): ReadonlyMap<number, ReadonlyArray<EarnedEntry>> {
  const index = new Map<number, Array<EarnedEntry>>();

  for (const entry of entries) {
    const list = index.get(entry.appId);

    if (list === undefined) index.set(entry.appId, [entry]);
    else list.push(entry);
  }

  return index;
}

function enrichEntries(
  resolveSchemas: (
    appIds: ReadonlyArray<AppId>,
  ) => Effect.Effect<ReadonlyMap<number, ReadonlyMap<string, GameAchievementSchemaValue>>, never>,
  entries: ReadonlyArray<EarnedEntry>,
  options: EnrichmentOptions,
): Effect.Effect<ReadonlyArray<RecentAchievement>, never> {
  const { top, appIds } = selectEntries(entries, options);

  return Effect.map(resolveSchemas(appIds), (schemaByAppId) => renderEntries(schemaByAppId, top));
}

/** Layer for the dashboard read model over Steam and D1 capabilities. */
export const layerWithoutDependencies = Layer.effect(Dashboard.Service, make);
