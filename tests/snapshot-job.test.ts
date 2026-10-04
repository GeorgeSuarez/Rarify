import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as TestClock from "effect/testing/TestClock";
import { SteamIdSchema, type Game, type Stats, type SteamId } from "@/lib/types";
import { layerWithoutDependencies as snapshotJobLayer } from "@/src/adapters/snapshot-job";
import type { LibrarySnapshot } from "@/src/domain/library";
import * as DashboardService from "@/src/services/dashboard";
import * as RarifyStore from "@/src/services/rarify-store";
import * as SnapshotJob from "@/src/services/snapshot-job";

const USER_A = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000001");

const USER_B = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000002");

const NOW = 1_700_000_000_000;

const TODAY = "2023-11-14";

const game: Game = {
  appId: 1245620,
  name: "Elden Ring",
  hours: 120,
  completion: 67,
  achievements: { earned: 2, total: 3 },
  comparison: { text: "You're ahead of", percent: 38.2, isPositive: true },
  image: "https://cdn.example/header.jpg",
  owned: true,
  tracked: false,
  unlocktimes: [],
};

interface RecordedSnapshot {
  readonly steamId: SteamId;
  readonly date: string;
  readonly stats: Stats;
}

/** Minimal persistence fake recording daily snapshot writes. */
const makeStoreLayer = (recorded: Ref.Ref<ReadonlyArray<RecordedSnapshot>>) =>
  Layer.succeed(
    RarifyStore.Service,
    RarifyStore.Service.of({
      getUserProfile: () => Effect.succeed(Option.none()),
      saveUserProfile: () => Effect.void,
      getTrackedAppIds: () => Effect.succeed([]),
      trackGame: () => Effect.void,
      untrackGame: () => Effect.void,
      getPreferences: () => Effect.succeed({ defaultFilter: "all" }),
      savePreferences: (_steamId, preferences) => Effect.succeed(preferences),
      getCachedLibrary: () => Effect.succeed(Option.none()),
      saveCachedLibrary: () => Effect.void,
      getPreviousSnapshot: () => Effect.succeed(Option.none()),
      recordDailySnapshot: (steamId, date, stats) =>
        Ref.update(recorded, (current) => [...current, { steamId, date, stats }]),
      listUserSteamIds: () => Effect.succeed([USER_A, USER_B]),
      getGameAchievementCache: () => Effect.succeed(new Map()),
      saveGameAchievementCache: () => Effect.void,
      getGameSchemaCache: () => Effect.succeed(new Map()),
      saveGameSchemaCache: () => Effect.void,
    }),
  );

const libraryFor = (steamId: SteamId): Effect.Effect<LibrarySnapshot, never> =>
  steamId === USER_A
    ? Effect.succeed({
        games: [game],
        earnedEntries: [],
        user: { personaName: "Dreadnought", avatar: "https://avatars.example/a.jpg" },
        error: null,
      })
    : Effect.succeed({
        games: [],
        earnedEntries: [],
        error: { type: "private_profile" as const, status: 200 },
      });

const makeDashboardLayer = Layer.succeed(
  DashboardService.Service,
  DashboardService.Service.of({
    getDashboard: () => Effect.die("not used"),
    getLibrary: libraryFor,
    getAchievementsOverview: () => Effect.die("not used"),
    getGameAchievements: () => Effect.die("not used"),
    getFriends: () => Effect.die("not used"),
    getFriendComparison: () => Effect.die("not used"),
  }),
);

describe("SnapshotJob.runDaily", () => {
  it("records one snapshot per public account and isolates private-profile failures", async () => {
    const recorded = await Effect.runPromise(Ref.make<ReadonlyArray<RecordedSnapshot>>([]));

    const result = await Effect.runPromise(
      TestClock.setTime(NOW).pipe(
        Effect.andThen(
          Effect.gen(function* () {
            const job = yield* SnapshotJob.Service;

            return yield* job.runDaily(NOW);
          }),
        ),
        Effect.provide(
          snapshotJobLayer.pipe(
            Layer.provide(Layer.mergeAll(makeDashboardLayer, makeStoreLayer(recorded))),
          ),
        ),
        Effect.provide(TestClock.layer()),
      ),
    );

    expect(result).toEqual({ attempted: 2, recorded: 1, failed: 1 });
    const rows = await Effect.runPromise(Ref.get(recorded));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.steamId).toBe(USER_A);
    expect(rows[0]?.date).toBe(TODAY);
    expect(rows[0]?.stats.gamesOwned).toBe(1);
    expect(rows[0]?.stats.achievementsEarned).toBe(2);
    expect(rows[0]?.stats.avgCompletion).toBe(67);
  });

  it("derives the snapshot date from the scheduled fire time in UTC", async () => {
    const recorded = await Effect.runPromise(Ref.make<ReadonlyArray<RecordedSnapshot>>([]));
    const lateEvening = Date.UTC(2023, 10, 14, 23, 59, 0);

    await Effect.runPromise(
      TestClock.setTime(lateEvening).pipe(
        Effect.andThen(
          Effect.gen(function* () {
            const job = yield* SnapshotJob.Service;

            return yield* job.runDaily(lateEvening);
          }),
        ),
        Effect.provide(
          snapshotJobLayer.pipe(
            Layer.provide(Layer.mergeAll(makeDashboardLayer, makeStoreLayer(recorded))),
          ),
        ),
        Effect.provide(TestClock.layer()),
      ),
    );

    const rows = await Effect.runPromise(Ref.get(recorded));
    expect(rows[0]?.date).toBe("2023-11-14");
  });
});
