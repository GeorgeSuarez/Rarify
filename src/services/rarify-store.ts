import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import type {
  AppId,
  Stats,
  SteamId,
  UserPreferences,
  UserProfile,
} from "../../lib/types.ts";
import type { PersistedSnapshot } from "../domain/library.ts";
import type { GameAchievementCacheEntry } from "../domain/library.ts";

/** Typed failure from D1 reads, writes, or row decoding. */
export class PersistenceError extends Schema.TaggedError<PersistenceError>()(
  "PersistenceError",
  {
    operation: Schema.String,
    message: Schema.String,
    cause: Schema.Defect(),
  },
) {}

/** Numeric values retained from a daily dashboard snapshot. */
export interface AchievementSnapshot {
  readonly achievementsEarned: number;
  readonly avgCompletion: number;
  readonly gamesOwned: number;
}

/** Steam profile fields stored when a user first signs in or refreshes. */
export interface UserProfileInput {
  readonly personaName: string;
  readonly avatar: string | null;
}

/** One game's freshly fetched achievement data awaiting a cache write. */
export interface GameAchievementCacheWrite {
  readonly appId: AppId;
  readonly entry: GameAchievementCacheEntry;
  readonly fetchedAtMs: number;
}

/** Cached achievement data for one game, with the time it was fetched. */
export interface GameAchievementCacheRead {
  readonly entry: GameAchievementCacheEntry;
  readonly fetchedAtMs: number;
}

/** Persistence capabilities owned by the Rarify D1 adapter. */
export interface Interface {
  /** Read the display profile saved for one Steam account. */
  readonly getUserProfile: (
    steamId: SteamId,
  ) => Effect.Effect<Option.Option<UserProfile>, PersistenceError>;

  /** Create or update the display profile saved for one Steam account. */
  readonly saveUserProfile: (
    steamId: SteamId,
    profile: UserProfileInput,
  ) => Effect.Effect<void, PersistenceError>;

  /** Read the IDs of games pinned by one Steam account. */
  readonly getTrackedAppIds: (
    steamId: SteamId,
  ) => Effect.Effect<ReadonlyArray<AppId>, PersistenceError>;

  /** Pin a game for a Steam account; repeated calls are safe. */
  readonly trackGame: (
    steamId: SteamId,
    appId: AppId,
  ) => Effect.Effect<void, PersistenceError>;

  /** Remove a pinned game for a Steam account; repeated calls are safe. */
  readonly untrackGame: (
    steamId: SteamId,
    appId: AppId,
  ) => Effect.Effect<void, PersistenceError>;

  /** Read the user's saved dashboard filter. */
  readonly getPreferences: (
    steamId: SteamId,
  ) => Effect.Effect<UserPreferences, PersistenceError>;

  /** Save the user's normalized dashboard preferences. */
  readonly savePreferences: (
    steamId: SteamId,
    preferences: UserPreferences,
  ) => Effect.Effect<UserPreferences, PersistenceError>;

  /** Read and decode the versioned library cache for one Steam account. */
  readonly getCachedLibrary: (
    steamId: SteamId,
  ) => Effect.Effect<Option.Option<PersistedSnapshot>, PersistenceError>;

  /** Store a complete library cache payload for one Steam account. */
  readonly saveCachedLibrary: (
    steamId: SteamId,
    snapshot: Omit<PersistedSnapshot, "version" | "fetchedAtMs">,
    fetchedAtMs: number,
  ) => Effect.Effect<void, PersistenceError>;

  /** Read the newest daily snapshot older than the requested day. */
  readonly getPreviousSnapshot: (
    steamId: SteamId,
    beforeDate: string,
  ) => Effect.Effect<Option.Option<AchievementSnapshot>, PersistenceError>;

  /**
   * Insert one account's daily snapshot idempotently for the supplied date.
   */
  readonly recordDailySnapshot: (
    steamId: SteamId,
    date: string,
    stats: Stats,
  ) => Effect.Effect<void, PersistenceError>;

  /** List Steam accounts that should be processed by the daily snapshot job. */
  readonly listUserSteamIds: () => Effect.Effect<ReadonlyArray<SteamId>, PersistenceError>;

  /**
   * Read cached per-game achievement data for one Steam account.
   *
   * Games without a cached row are simply absent from the returned map.
   */
  readonly getGameAchievementCache: (
    steamId: SteamId,
  ) => Effect.Effect<ReadonlyMap<number, GameAchievementCacheRead>, PersistenceError>;

  /** Upsert freshly fetched achievement data for one or more games. */
  readonly saveGameAchievementCache: (
    steamId: SteamId,
    entries: ReadonlyArray<GameAchievementCacheWrite>,
  ) => Effect.Effect<void, PersistenceError>;
}

/**
 * Effect service for Rarify's user, tracked-game, preference, cache, and
 * historical snapshot persistence.
 */
export class Service extends Context.Service<Service, Interface>()(
  "@rarify/RarifyStore",
) {}
