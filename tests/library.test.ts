import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as TestClock from "effect/testing/TestClock";
import {
  AppIdSchema,
  SteamIdSchema,
  type AppId,
  type SteamGlobalAchievement,
  type SteamOwnedGame,
  type SteamPlayerAchievement,
  type Stats,
  type UserPreferences,
} from "@/lib/types";
import { SNAPSHOT_TTL_MS } from "@/src/domain/library";
import type { LibrarySnapshot, PersistedSnapshot } from "@/src/domain/library";
import { layerWithoutDependencies as dashboardLayer } from "@/src/adapters/dashboard-service";
import * as DashboardService from "@/src/services/dashboard";
import * as RarifyStore from "@/src/services/rarify-store";
import * as SteamClient from "@/src/services/steam-client";

const STEAM_ID = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000001");

/** Achievement names the scripted Steam client returns for bulk test games. */
function generatedAchievements(appId: number): ReadonlyArray<string> {
  return appId >= 1000 && appId < 1100 ? [`ACH_${appId}`] : [];
}

const OTHER_STEAM_ID = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000002");

const NOW = 1_700_000_000_000;

const ONE_DAY_MS = 86_400_000;

const OWNED_GAMES: ReadonlyArray<SteamOwnedGame> = [
  {
    appid: 1245620,
    name: "Elden Ring",
    playtime_forever: 7200,
    img_icon_url: "abc",
    img_logo_url: "def",
    has_community_visible_stats: true,
  },
  {
    appid: 292030,
    name: "The Witcher 3: Wild Hunt",
    playtime_forever: 5880,
    img_icon_url: "ghi",
    img_logo_url: "jkl",
    has_community_visible_stats: true,
  },
  {
    appid: 367520,
    name: "Hollow Knight",
    playtime_forever: 2700,
    img_icon_url: "mno",
    img_logo_url: "pqr",
    has_community_visible_stats: true,
  },
];

const PLAYER_ACHIEVEMENTS = new Map<number, ReadonlyArray<SteamPlayerAchievement>>([
  [
    1245620,
    [
      { apiname: "ELD_1", achieved: 1, unlocktime: NOW / 1000 - 3 * 86_400 },
      { apiname: "ELD_2", achieved: 1, unlocktime: NOW / 1000 - 10 * 86_400 },
      { apiname: "ELD_3", achieved: 0, unlocktime: 0 },
    ],
  ],
  [
    292030,
    [
      { apiname: "W3_1", achieved: 1, unlocktime: NOW / 1000 - 2 * 86_400 },
      { apiname: "W3_2", achieved: 1, unlocktime: NOW / 1000 - 5 * 86_400 },
      { apiname: "W3_3", achieved: 1, unlocktime: NOW / 1000 - 8 * 86_400 },
      { apiname: "W3_4", achieved: 0, unlocktime: 0 },
    ],
  ],
]);

const GLOBAL_PERCENTAGES = new Map<number, ReadonlyArray<SteamGlobalAchievement>>([
  [
    1245620,
    [
      { name: "ELD_1", percent: 78.5 },
      { name: "ELD_2", percent: 30.7 },
      { name: "ELD_3", percent: 5.4 },
    ],
  ],
  [
    292030,
    [
      { name: "W3_1", percent: 90.1 },
      { name: "W3_2", percent: 60.2 },
      { name: "W3_3", percent: 20.3 },
      { name: "W3_4", percent: 10.4 },
    ],
  ],
]);

const SCHEMAS = new Map([
  [
    "ELD_1",
    {
      displayName: "Elden Lord",
      description: "Elden Lord description",
      icon: "https://cdn.example/ELD_1.jpg",
      icongray: "https://cdn.example/ELD_1_gray.jpg",
    },
  ],
  [
    "ELD_2",
    {
      displayName: "Age of Stars",
      description: "Age of Stars description",
      icon: "https://cdn.example/ELD_2.jpg",
      icongray: "https://cdn.example/ELD_2_gray.jpg",
    },
  ],
  [
    "W3_1",
    {
      displayName: "Geralt",
      description: "Geralt description",
      icon: "https://cdn.example/W3_1.jpg",
      icongray: "https://cdn.example/W3_1_gray.jpg",
    },
  ],
]);

interface StoreState {
  tracked: ReadonlyArray<AppId>;
  preferences: UserPreferences;
  cached: Option.Option<PersistedSnapshot>;
  snapshots: ReadonlyArray<{ readonly date: string; readonly stats: Stats }>;
  profile: Option.Option<{ personaName: string; avatar: string }>;
  schemas: ReadonlyMap<number, RarifyStore.GameSchemaCacheRead>;
}

/** Faithful in-memory implementation of the Rarify persistence contract. */
const makeStoreLayer = (
  state: Ref.Ref<StoreState>,
  achievementCache: Ref.Ref<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>,
): Layer.Layer<RarifyStore.Service> =>
  Layer.effect(
    RarifyStore.Service,
    Effect.sync(() => {
      const read = Ref.get(state);
      const update = Ref.update;

      return RarifyStore.Service.of({
        getUserProfile: Effect.fn("TestStore.getUserProfile")(() =>
          Effect.map(read, (state) => state.profile),
        ),
        saveUserProfile: Effect.fn("TestStore.saveUserProfile")(function* (_steamId, profile) {
          yield* update(state, (current) => ({
            ...current,
            profile: Option.some({
              personaName: profile.personaName,
              avatar: profile.avatar ?? "",
            }),
          }));
        }),
        getTrackedAppIds: Effect.fn("TestStore.getTrackedAppIds")(() =>
          Effect.map(read, (state) => state.tracked),
        ),
        trackGame: Effect.fn("TestStore.trackGame")(function* (_steamId, appId) {
          yield* update(state, (current) => ({
            ...current,
            tracked: current.tracked.includes(appId)
              ? current.tracked
              : [...current.tracked, appId],
          }));
        }),
        untrackGame: Effect.fn("TestStore.untrackGame")(function* (_steamId, appId) {
          yield* update(state, (current) => ({
            ...current,
            tracked: current.tracked.filter((tracked) => tracked !== appId),
          }));
        }),
        getPreferences: Effect.fn("TestStore.getPreferences")(() =>
          Effect.map(read, (state) => state.preferences),
        ),
        savePreferences: Effect.fn("TestStore.savePreferences")(function* (_steamId, preferences) {
          yield* update(state, (current) => ({ ...current, preferences }));

          return preferences;
        }),
        getCachedLibrary: Effect.fn("TestStore.getCachedLibrary")(() =>
          Effect.map(read, (state) => state.cached),
        ),
        saveCachedLibrary: Effect.fn("TestStore.saveCachedLibrary")(
          function* (_steamId, snapshot, fetchedAtMs) {
            yield* update(state, (current) => ({
              ...current,
              cached: Option.some({
                ...snapshot,
                version: 1,
                fetchedAtMs,
              }),
            }));
          },
        ),
        getPreviousSnapshot: Effect.fn("TestStore.getPreviousSnapshot")(() =>
          Effect.map(read, (state) => {
            const snapshot = state.snapshots.at(0);

            if (snapshot === undefined) return Option.none();

            return Option.some({
              achievementsEarned: snapshot.stats.achievementsEarned,
              avgCompletion: snapshot.stats.avgCompletion,
              gamesOwned: snapshot.stats.gamesOwned,
            });
          }),
        ),
        recordDailySnapshot: Effect.fn("TestStore.recordDailySnapshot")(
          function* (_steamId, date, stats) {
            yield* update(state, (current) => ({
              ...current,
              snapshots: [{ date, stats }, ...current.snapshots],
            }));
          },
        ),
        listUserSteamIds: Effect.fn("TestStore.listUserSteamIds")(() => Effect.succeed([STEAM_ID])),
        getGameAchievementCache: Effect.fn("TestStore.getGameAchievementCache")(() =>
          Effect.map(Ref.get(achievementCache), (cache) => new Map(cache)),
        ),
        saveGameAchievementCache: Effect.fn("TestStore.saveGameAchievementCache")(
          (_steamId, entries) =>
            Ref.update(achievementCache, (current) => {
              const next = new Map(current);

              for (const { appId, entry, fetchedAtMs } of entries) {
                next.set(appId, { entry, fetchedAtMs });
              }

              return next;
            }),
        ),
        getGameSchemaCache: Effect.fn("TestStore.getGameSchemaCache")((appIds) =>
          Effect.map(read, (state) => {
            const result = new Map<number, RarifyStore.GameSchemaCacheRead>();

            for (const appId of appIds) {
              const cached = state.schemas.get(appId);

              if (cached !== undefined) result.set(appId, cached);
            }

            return result;
          }),
        ),
        saveGameSchemaCache: Effect.fn("TestStore.saveGameSchemaCache")((entries) =>
          update(state, (current) => {
            const schemas = new Map(current.schemas);

            for (const { appId, schema, fetchedAtMs } of entries) {
              schemas.set(appId, { schema, fetchedAtMs });
            }

            return { ...current, schemas };
          }),
        ),
      });
    }),
  );

/**
 * Steam client whose responses are scripted per test.
 *
 * @param config - Scripted owned-games payload with a recorded call log.
 * @param schemaFailures - Game IDs whose schema fetch fails like Steam's
 *   HTTP 400 for titles without achievement stats.
 */
const makeSteamLayer = (
  config: Ref.Ref<{
    ownedGames: SteamClient.OwnedGamesResult;
    calls: ReadonlyArray<string>;
  }>,
  schemaFailures: ReadonlySet<number> = new Set(),
): Layer.Layer<SteamClient.Service> =>
  Layer.effect(
    SteamClient.Service,
    Effect.sync(() =>
      SteamClient.Service.of({
        getOwnedGames: Effect.fn("TestSteam.getOwnedGames")(function* () {
          yield* Ref.update(config, (current) => ({
            ...current,
            calls: [...current.calls, "getOwnedGames"],
          }));

          return (yield* Ref.get(config)).ownedGames;
        }),
        getPlayerAchievements: Effect.fn("TestSteam.getPlayerAchievements")((_steamId, appId) =>
          Effect.succeed(
            PLAYER_ACHIEVEMENTS.get(appId) ??
              generatedAchievements(appId).map((apiname) => ({
                apiname,
                achieved: 1,
                unlocktime: NOW / 1000,
              })),
          ),
        ),
        getGlobalAchievementPercentages: Effect.fn("TestSteam.getGlobalAchievementPercentages")(
          (appId) =>
            Effect.succeed(
              GLOBAL_PERCENTAGES.get(appId) ??
                generatedAchievements(appId).map((name) => ({ name, percent: 50 })),
            ),
        ),
        getPlayerSummaries: Effect.fn("TestSteam.getPlayerSummaries")(() =>
          Effect.succeed([
            {
              steamId: STEAM_ID,
              personaName: "Dreadnought",
              avatar: "https://avatars.steamstatic.com/a1.jpg",
              avatarFull: "https://avatars.steamstatic.com/a1_full.jpg",
              profileUrl: "https://steamcommunity.com/id/dreadnought",
            },
          ]),
        ),
        getFriendIds: Effect.fn("TestSteam.getFriendIds")(() => Effect.succeed([OTHER_STEAM_ID])),
        getGameAchievementSchema: Effect.fn("TestSteam.getGameAchievementSchema")(
          function* (appId) {
            yield* Ref.update(config, (current) => ({
              ...current,
              calls: [...current.calls, `getGameAchievementSchema:${appId}`],
            }));

            if (schemaFailures.has(appId)) {
              return yield* Effect.fail(
                new SteamClient.SteamApiError({
                  operation: "getGameAchievementSchema",
                  message: "Steam API returned HTTP 400 during getGameAchievementSchema",
                  status: 400,
                  cause: new Error("Steam API returned HTTP 400"),
                }),
              );
            }

            return SCHEMAS;
          },
        ),
      }),
    ),
  );

const initialState: StoreState = {
  tracked: [],
  preferences: { defaultFilter: "all" },
  cached: Option.none(),
  snapshots: [],
  profile: Option.none(),
  schemas: new Map(),
};

const runWithServices = <A, E>(
  effect: Effect.Effect<A, E, DashboardService.Service>,
  state: Ref.Ref<StoreState>,
  config: Ref.Ref<{
    ownedGames: SteamClient.OwnedGamesResult;
    calls: ReadonlyArray<string>;
  }>,
  achievementCache: Ref.Ref<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>,
  schemaFailures: ReadonlySet<number> = new Set(),
) =>
  TestClock.setTime(NOW).pipe(
    Effect.andThen(effect),
    Effect.provide(
      dashboardLayer.pipe(
        Layer.provide(
          Layer.mergeAll(
            makeSteamLayer(config, schemaFailures),
            makeStoreLayer(state, achievementCache),
          ),
        ),
      ),
    ),
    Effect.provide(TestClock.layer()),
  );

describe("DashboardService.getLibrary", () => {
  it("enriches the Steam library with achievements, comparisons, and profile", async () => {
    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getLibrary(STEAM_ID);
        }),
        state,
        config,
        achievementCache,
      ),
    );

    expect(result.error).toBeNull();
    expect(result.games.map((game) => game.appId)).toEqual([1245620, 292030, 367520]);

    const eldenRing = result.games[0];
    expect(eldenRing?.hours).toBe(120);
    expect(eldenRing?.achievements).toEqual({ earned: 2, total: 3 });
    expect(eldenRing?.completion).toBe(67);
    expect(eldenRing?.comparison).toEqual({
      text: "You're ahead of",
      percent: 38.2,
      isPositive: true,
    });
    expect(eldenRing?.tracked).toBe(false);
    expect(result.games[2]?.hours).toBe(45);

    expect(result.earnedEntries).toHaveLength(5);
    expect(result.earnedEntries[0]).toMatchObject({
      appId: 1245620,
      gameName: "Elden Ring",
      apiname: "ELD_1",
      globalPercent: 78.5,
    });
    // The optional profile key is omitted rather than set to `undefined`, so
    // the JSON response still satisfies the `optionalKey` schema.
    expect(Object.hasOwn(result, "user")).toBe(false);
  });

  it("returns a private-profile error with no enrichment", async () => {
    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({
        ownedGames: { ok: false, reason: "private_profile", status: 200 },
        calls: [],
      }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getLibrary(STEAM_ID);
        }),
        state,
        config,
        achievementCache,
      ),
    );

    expect(result.error).toEqual({ type: "private_profile", status: 200 });
    expect(result.games).toEqual([]);
    expect(result.earnedEntries).toEqual([]);
  });

  it("returns an empty library without error when the account owns no games", async () => {
    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: [] }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getLibrary(STEAM_ID);
        }),
        state,
        config,
        achievementCache,
      ),
    );

    expect(result.error).toBeNull();
    expect(result.games).toEqual([]);
  });

  it("serves a fresh cached snapshot without hitting Steam", async () => {
    const state = await Effect.runPromise(
      Ref.make<StoreState>({
        ...initialState,
        cached: Option.some({
          version: 1,
          fetchedAtMs: NOW - SNAPSHOT_TTL_MS / 2,
          games: [
            {
              appId: 200,
              name: "Cached Game",
              hours: 3,
              completion: 20,
              achievements: { earned: 2, total: 10 },
              comparison: { text: "You're behind", percent: 40, isPositive: false },
              image: "https://cdn.example/200/header.jpg",
              owned: true,
              tracked: false,
              unlocktimes: [],
            },
          ],
          earnedEntries: [],
        }),
        tracked: [],
      }),
    );

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getLibrary(STEAM_ID);
        }),
        state,
        config,
        achievementCache,
      ),
    );

    const calls = await Effect.runPromise(Ref.get(config));
    expect(calls.calls).toEqual([]);
    expect(result.games.map((game) => game.appId)).toEqual([200]);
  });

  it("falls back to a stale cached snapshot when Steam reports a private profile", async () => {
    const state = await Effect.runPromise(
      Ref.make<StoreState>({
        ...initialState,
        cached: Option.some({
          version: 1,
          fetchedAtMs: NOW - ONE_DAY_MS,
          games: [
            {
              appId: 200,
              name: "Stale Game",
              hours: 2,
              completion: 20,
              achievements: { earned: 2, total: 10 },
              comparison: { text: "You're behind", percent: 40, isPositive: false },
              image: "https://cdn.example/200/header.jpg",
              owned: true,
              tracked: false,
              unlocktimes: [],
            },
          ],
          earnedEntries: [],
        }),
      }),
    );

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({
        ownedGames: { ok: false, reason: "private_profile", status: 200 },
        calls: [],
      }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getLibrary(STEAM_ID);
        }),
        state,
        config,
        achievementCache,
      ),
    );

    expect(result.error).toBeNull();
    expect(result.games.map((game) => game.appId)).toEqual([200]);
  });

  it("refetches from Steam when the cache is stale", async () => {
    const state = await Effect.runPromise(
      Ref.make<StoreState>({
        ...initialState,
        cached: Option.some({
          version: 1,
          fetchedAtMs: NOW - ONE_DAY_MS,
          games: [],
          earnedEntries: [],
        }),
      }),
    );

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getLibrary(STEAM_ID);
        }),
        state,
        config,
        achievementCache,
      ),
    );

    expect(result.games.map((game) => game.appId)).toEqual([1245620, 292030, 367520]);
    const calls = await Effect.runPromise(Ref.get(config));
    expect(calls.calls).toEqual(["getOwnedGames"]);
  });
});

describe("DashboardService.getGameAchievements", () => {
  it("merges Steam schema metadata and global percentages into each row", async () => {
    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getGameAchievements(
            STEAM_ID,
            Schema.decodeUnknownSync(AppIdSchema)(1245620),
          );
        }),
        state,
        config,
        achievementCache,
      ),
    );

    expect(result.gameName).toBe("Elden Ring");
    expect(result.hours).toBe(120);
    expect(result.earnedAchievements).toBe(2);
    expect(result.totalAchievements).toBe(3);
    expect(result.completion).toBe(67);
    expect(result.achievements[0]).toMatchObject({
      apiname: "ELD_1",
      name: "Elden Lord",
      achieved: true,
      globalPercent: 78.5,
    });
  });
  describe("DashboardService.getDashboard", () => {
    it("applies tracked state and filters the tracked view", async () => {
      const trackedAppId = Schema.decodeUnknownSync(AppIdSchema)(1245620);

      const state = await Effect.runPromise(
        Ref.make<StoreState>({
          ...initialState,
          tracked: [trackedAppId],
        }),
      );

      const achievementCache = await Effect.runPromise(
        Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
      );

      const config = await Effect.runPromise(
        Ref.make<{
          ownedGames: SteamClient.OwnedGamesResult;
          calls: ReadonlyArray<string>;
        }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
      );

      const [all, tracked] = await Effect.runPromise(
        runWithServices(
          Effect.gen(function* () {
            const dashboard = yield* DashboardService.Service;

            return yield* Effect.all(
              [
                dashboard.getDashboard(STEAM_ID, "all"),
                dashboard.getDashboard(STEAM_ID, "tracked"),
              ],
              { concurrency: "unbounded" },
            );
          }),
          state,
          config,
          achievementCache,
        ),
      );

      expect(all.stats.gamesTracked).toBe(1);
      expect(all.games.find((game) => game.appId === 1245620)?.tracked).toBe(true);
      expect(tracked.games.map((game) => game.appId)).toEqual([1245620]);
      expect(tracked.stats.gamesOwned).toBe(1);
    });
  });
  describe("DashboardService.getLibrary enrichment failures", () => {
    it("keeps games whose achievement data could not be read", async () => {
      const state = await Effect.runPromise(Ref.make(initialState));

      const achievementCache = await Effect.runPromise(
        Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
      );

      const config = await Effect.runPromise(
        Ref.make<{
          ownedGames: SteamClient.OwnedGamesResult;
          calls: ReadonlyArray<string>;
        }>({
          ownedGames: {
            ok: true,
            games: [
              {
                appid: 1245620,
                name: "Elden Ring",
                playtime_forever: 7200,
                img_icon_url: "abc",
                img_logo_url: "",
                has_community_visible_stats: true,
              },
              {
                appid: 999999,
                name: "Unreadable Game",
                playtime_forever: 600,
                img_icon_url: "xyz",
                img_logo_url: "",
                has_community_visible_stats: true,
              },
            ],
          },
          calls: [],
        }),
      );

      const result = await Effect.runPromise(
        runWithServices(
          Effect.gen(function* () {
            const dashboard = yield* DashboardService.Service;

            return yield* dashboard.getLibrary(STEAM_ID);
          }),
          state,
          config,
          achievementCache,
        ),
      );

      expect(result.games.map((game) => game.appId)).toEqual([1245620, 999999]);
      const unreadable = result.games.find((game) => game.appId === 999999);
      expect(unreadable?.achievements).toEqual({ earned: 0, total: 0 });
      expect(unreadable?.completion).toBe(0);
      expect(result.games.find((game) => game.appId === 1245620)?.completion).toBe(67);
    });
  });
  describe("DashboardService progressive enrichment", () => {
    it("enriches the library in bounded batches across requests", async () => {
      const generatedGames = Array.from({ length: 25 }, (_, index) => {
        const appId = 1000 + index;

        return {
          appid: appId,
          name: `Generated Game ${appId}`,
          playtime_forever: 600,
          img_icon_url: "",
          img_logo_url: "",
          has_community_visible_stats: true,
        };
      });

      const state = await Effect.runPromise(Ref.make(initialState));

      const achievementCache = await Effect.runPromise(
        Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
      );

      const config = await Effect.runPromise(
        Ref.make<{
          ownedGames: SteamClient.OwnedGamesResult;
          calls: ReadonlyArray<string>;
        }>({ ownedGames: { ok: true, games: generatedGames }, calls: [] }),
      );

      const { first, second, cacheAfterFirst, cacheAfterSecond } = await Effect.runPromise(
        runWithServices(
          Effect.gen(function* () {
            const dashboard = yield* DashboardService.Service;
            const first = yield* dashboard.getLibrary(STEAM_ID);
            const cacheAfterFirst = yield* Ref.get(achievementCache);
            // Move past the short library-snapshot TTL so the next request
            // continues enriching instead of serving the same snapshot.
            yield* TestClock.adjust("61 seconds");
            const second = yield* dashboard.getLibrary(STEAM_ID);
            const cacheAfterSecond = yield* Ref.get(achievementCache);

            return { first, second, cacheAfterFirst, cacheAfterSecond };
          }),
          state,
          config,
          achievementCache,
        ),
      );

      const enrichedCount = (library: LibrarySnapshot) =>
        library.games.filter((game) => game.achievements.total > 0).length;

      // The per-invocation batch limit keeps a single request inside the
      // Worker subrequest budget; later requests fill in the remainder.
      expect(enrichedCount(first)).toBe(20);
      expect(first.games).toHaveLength(25);
      expect(cacheAfterFirst.size).toBe(20);

      expect(enrichedCount(second)).toBe(25);
      expect(cacheAfterSecond.size).toBe(25);
    });
  });
});

describe("DashboardService schema resilience", () => {
  it("serves the dashboard when one game's schema fetch fails", async () => {
    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getDashboard(STEAM_ID, "all");
        }),
        state,
        config,
        achievementCache,
        new Set([292030]),
      ),
    );

    expect(result.error).toBeNull();
    // The healthy game's achievements keep their Steam display metadata.
    expect(result.recentAchievements.map((entry) => entry.name)).toContain("Elden Lord");
    expect(result.recentAchievements.find((entry) => entry.name === "Elden Lord")).toMatchObject({
      description: "Elden Lord description",
    });

    // The failed game's achievements fall back to their Steam API names.
    const witcher = result.recentAchievements.find(
      (entry) => entry.gameName === "The Witcher 3: Wild Hunt",
    );

    expect(witcher?.name).toBe("W3_1");
    expect(witcher).not.toHaveProperty("description");
    // The miss is cached as an empty schema so it is not refetched.
    const schemas = (await Effect.runPromise(Ref.get(state))).schemas;
    expect(schemas.get(292030)?.schema).toEqual({});
    expect(Object.keys(schemas.get(1245620)?.schema ?? {})).toContain("ELD_1");
  });

  it("serves schemas from the cache without calling Steam again", async () => {
    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
    );

    await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;
          yield* dashboard.getDashboard(STEAM_ID, "all");
          // The library snapshot TTL is short but the schema cache lives a
          // full day, so the second load must not touch Steam for schemas.
          yield* dashboard.getDashboard(STEAM_ID, "all");
        }),
        state,
        config,
        achievementCache,
      ),
    );

    const calls = (await Effect.runPromise(Ref.get(config))).calls.filter((call) =>
      call.startsWith("getGameAchievementSchema"),
    );

    expect(calls).toHaveLength(2);
    expect(new Set(calls).size).toBe(2);
  });

  it("serves the game page when its schema fetch fails", async () => {
    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getGameAchievements(
            STEAM_ID,
            Schema.decodeUnknownSync(AppIdSchema)(292030),
          );
        }),
        state,
        config,
        achievementCache,
        new Set([292030]),
      ),
    );

    expect(result.error).toBeNull();
    expect(result.earnedAchievements).toBe(3);
    expect(result.achievements[0]).toMatchObject({
      apiname: "W3_1",
      name: "W3_1",
      achieved: true,
    });
  });
});

describe("DashboardService achievements overview batching", () => {
  it("resolves each game's schema at most once across all sections", async () => {
    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: OWNED_GAMES }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getAchievementsOverview(STEAM_ID);
        }),
        state,
        config,
        achievementCache,
      ),
    );

    expect(result.error).toBeNull();
    expect(result.recentAchievements).toHaveLength(5);
    expect(result.rarestAchievements.length).toBeGreaterThan(0);
    // Only Elden Ring and The Witcher 3 have cached achievement data, so the
    // per-game table covers exactly those two games.
    expect(result.rarestPerGame.map((row) => row.appId).sort()).toEqual([1245620, 292030]);
    expect(result.rarestPerGame.find((row) => row.appId === 1245620)?.achievement.name).toBe(
      "Age of Stars",
    );

    // Recent, rarest, and per-game sections share one batched resolution:
    // two games, two Steam schema fetches, no duplicates.
    const schemaCalls = (await Effect.runPromise(Ref.get(config))).calls.filter((call) =>
      call.startsWith("getGameAchievementSchema"),
    );

    expect(schemaCalls).toHaveLength(2);
    expect(new Set(schemaCalls).size).toBe(2);
  });

  it("serves a large library with one schema fetch per game", async () => {
    const generatedGames = Array.from({ length: 25 }, (_, index) => {
      const appId = 1000 + index;

      return {
        appid: appId,
        name: `Generated Game ${appId}`,
        playtime_forever: 600,
        img_icon_url: "",
        img_logo_url: "",
        has_community_visible_stats: true,
      };
    });

    const state = await Effect.runPromise(Ref.make(initialState));

    const achievementCache = await Effect.runPromise(
      Ref.make<ReadonlyMap<number, RarifyStore.GameAchievementCacheRead>>(new Map()),
    );

    const config = await Effect.runPromise(
      Ref.make<{
        ownedGames: SteamClient.OwnedGamesResult;
        calls: ReadonlyArray<string>;
      }>({ ownedGames: { ok: true, games: generatedGames }, calls: [] }),
    );

    const result = await Effect.runPromise(
      runWithServices(
        Effect.gen(function* () {
          const dashboard = yield* DashboardService.Service;

          return yield* dashboard.getAchievementsOverview(STEAM_ID);
        }),
        state,
        config,
        achievementCache,
      ),
    );

    expect(result.error).toBeNull();
    // The per-invocation enrichment batch covers 20 of the 25 games, so only
    // those reach the per-game table on the first load.
    expect(result.rarestPerGame).toHaveLength(20);

    // One batched resolution for recent (20) + rarest (10) + per-game (20):
    // every game fetched exactly once, regardless of section overlap.
    const schemaCalls = (await Effect.runPromise(Ref.get(config))).calls.filter((call) =>
      call.startsWith("getGameAchievementSchema"),
    );

    expect(schemaCalls).toHaveLength(20);
    expect(new Set(schemaCalls).size).toBe(20);
  });
});
