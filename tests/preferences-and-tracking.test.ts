import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import { AppIdSchema, SteamIdSchema, type AppId, type UserPreferences } from "@/lib/types";
import { layerWithoutDependencies as preferencesLayer } from "@/src/adapters/preferences-service";
import { layerWithoutDependencies as trackedGamesLayer } from "@/src/adapters/tracked-games-service";
import * as Preferences from "@/src/services/preferences";
import * as RarifyStore from "@/src/services/rarify-store";
import * as TrackedGames from "@/src/services/tracked-games";

const STEAM_ID = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000001");

const APP_ID = Schema.decodeUnknownSync(AppIdSchema)(1245620);

interface StoreState {
  readonly preferences: Option.Option<UserPreferences>;
  readonly tracked: ReadonlyArray<AppId>;
}

const emptyState: StoreState = {
  preferences: Option.none(),
  tracked: [],
};

/** In-memory persistence focused on preferences and tracked games. */
const makeStoreLayer = (state: Ref.Ref<StoreState>) =>
  Layer.succeed(
    RarifyStore.Service,
    RarifyStore.Service.of({
      getUserProfile: () => Effect.succeed(Option.none()),
      saveUserProfile: () => Effect.void,
      getTrackedAppIds: () => Effect.map(Ref.get(state), (current) => current.tracked),
      trackGame: (_steamId, appId) =>
        Ref.update(state, (current) => ({
          ...current,
          tracked: current.tracked.includes(appId)
            ? current.tracked
            : [...current.tracked, appId],
        })),
      untrackGame: (_steamId, appId) =>
        Ref.update(state, (current) => ({
          ...current,
          tracked: current.tracked.filter((tracked) => tracked !== appId),
        })),
      getPreferences: () =>
        Effect.map(Ref.get(state), (current) =>
          Option.getOrElse(current.preferences, () => ({ defaultFilter: "all" as const })),
        ),
      savePreferences: (_steamId, preferences) =>
        Ref.update(state, (current) => ({
          ...current,
          preferences: Option.some(preferences),
        })).pipe(Effect.as(preferences)),
      getCachedLibrary: () => Effect.succeed(Option.none()),
      saveCachedLibrary: () => Effect.void,
      getPreviousSnapshot: () => Effect.succeed(Option.none()),
      recordDailySnapshot: () => Effect.void,
      listUserSteamIds: () => Effect.succeed([]),
      getGameAchievementCache: () => Effect.succeed(new Map()),
      saveGameAchievementCache: () => Effect.void,
      getGameSchemaCache: () => Effect.succeed(new Map()),
      saveGameSchemaCache: () => Effect.void,
    }),
  );

describe("PreferencesService", () => {
  it("defaults to the all-games filter when nothing is saved", async () => {
    const state = await Effect.runPromise(Ref.make(emptyState));

    const preferences = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* Preferences.Service;

        return yield* service.get(STEAM_ID);
      }).pipe(
        Effect.provide(preferencesLayer.pipe(Layer.provide(makeStoreLayer(state)))),
      ),
    );

    expect(preferences).toEqual({ defaultFilter: "all" });
  });

  it("normalizes a saved filter and returns the persisted value", async () => {
    const state = await Effect.runPromise(Ref.make(emptyState));

    const saved = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* Preferences.Service;

        return yield* service.save(STEAM_ID, { defaultFilter: "tracked" });
      }).pipe(
        Effect.provide(preferencesLayer.pipe(Layer.provide(makeStoreLayer(state)))),
      ),
    );

    expect(saved).toEqual({ defaultFilter: "tracked" });
    const stored = await Effect.runPromise(Ref.get(state));
    expect(Option.getOrThrow(stored.preferences)).toEqual({ defaultFilter: "tracked" });
  });

  it("keeps the current filter when the update omits a value", async () => {
    const state = await Effect.runPromise(
      Ref.make<StoreState>({
        preferences: Option.some({ defaultFilter: "owned" }),
        tracked: [],
      }),
    );

    const saved = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* Preferences.Service;

        return yield* service.save(STEAM_ID, {});
      }).pipe(
        Effect.provide(preferencesLayer.pipe(Layer.provide(makeStoreLayer(state)))),
      ),
    );

    expect(saved).toEqual({ defaultFilter: "owned" });
  });
});

describe("TrackedGamesService", () => {
  it("tracks and untracks without duplicating entries", async () => {
    const state = await Effect.runPromise(Ref.make(emptyState));

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* TrackedGames.Service;
        yield* service.track(STEAM_ID, APP_ID);
        yield* service.track(STEAM_ID, APP_ID);
      }).pipe(
        Effect.provide(trackedGamesLayer.pipe(Layer.provide(makeStoreLayer(state)))),
      ),
    );

    const afterTrack = await Effect.runPromise(Ref.get(state));
    expect(afterTrack.tracked).toEqual([APP_ID]);

    await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* TrackedGames.Service;
        yield* service.untrack(STEAM_ID, APP_ID);
      }).pipe(
        Effect.provide(trackedGamesLayer.pipe(Layer.provide(makeStoreLayer(state)))),
      ),
    );

    const afterUntrack = await Effect.runPromise(Ref.get(state));
    expect(afterUntrack.tracked).toEqual([]);
  });
});
