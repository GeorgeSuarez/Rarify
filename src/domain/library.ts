import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  DashboardErrorSchema,
  GameSchema,
  SteamGlobalAchievementSchema,
  SteamPlayerAchievementSchema,
  UserProfileSchema,
} from "../../lib/types.ts";

/** Version used to invalidate incompatible cached Steam library payloads. */
export const SNAPSHOT_VERSION = 1;

/** Cache lifetime for an enriched Steam library snapshot. */
export const SNAPSHOT_TTL_MS = 60 * 1000;

/**
 * Cache lifetime for one game's achievement data. Longer than the library
 * snapshot because per-game Steam reads are the expensive part.
 */
export const GAME_ACHIEVEMENT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Runtime schema for cached per-game achievement data. */
export const GameAchievementCacheEntrySchema = Schema.Struct({
  achievements: Schema.Array(SteamPlayerAchievementSchema),
  globalPercentages: Schema.Array(SteamGlobalAchievementSchema),
});

/** Runtime schema for one cached achievement display-metadata record. */
export const GameAchievementSchemaValueSchema = Schema.Struct({
  displayName: Schema.String,
  description: Schema.String,
  icon: Schema.String,
  icongray: Schema.String,
});

/** Display metadata cached for one achievement API name. */
export type GameAchievementSchemaValue =
  typeof GameAchievementSchemaValueSchema.Type;

/**
 * Runtime schema for a game's achievement display metadata keyed by API name.
 *
 * An empty map is a valid cached value meaning Steam has no schema for the
 * game, so failed lookups are cached too and never refetched within the TTL.
 */
export const GameAchievementSchemaMapSchema = Schema.Record(
  Schema.String,
  GameAchievementSchemaValueSchema,
);

/** Achievement display metadata cached for one game. */
export type GameAchievementSchemaMap =
  typeof GameAchievementSchemaMapSchema.Type;

/** Achievement data cached for one Steam account and game. */
export type GameAchievementCacheEntry = typeof GameAchievementCacheEntrySchema.Type;

/** Runtime schema for one earned achievement stored with a library snapshot. */
export const EarnedEntrySchema = Schema.Struct({
  appId: Schema.Number,
  gameName: Schema.String,
  apiname: Schema.String,
  unlocktime: Schema.Number,
  globalPercent: Schema.Number,
});

/** Achievement fields needed for dashboard sorting and rarity calculations. */
export type EarnedEntry = typeof EarnedEntrySchema.Type;

/** Runtime schema for the enriched Steam library returned by application services. */
export const LibrarySnapshotSchema = Schema.Struct({
  games: Schema.Array(GameSchema),
  earnedEntries: Schema.Array(EarnedEntrySchema),
  user: Schema.optionalKey(UserProfileSchema),
  error: DashboardErrorSchema,
});

/** Current library view with profile and any Steam visibility error. */
export type LibrarySnapshot = typeof LibrarySnapshotSchema.Type;

/** Runtime schema for the versioned cache payload persisted in D1. */
export const PersistedSnapshotSchema = Schema.Struct({
  version: Schema.Number,
  fetchedAtMs: Schema.Number,
  games: Schema.Array(GameSchema),
  earnedEntries: Schema.Array(EarnedEntrySchema),
  user: Schema.optionalKey(UserProfileSchema),
});

/** Data saved in the per-player library cache. */
export type PersistedSnapshot = typeof PersistedSnapshotSchema.Type;

/** Serialize a validated library snapshot for persistent cache storage. */
export function serializeSnapshot(snapshot: PersistedSnapshot): string {
  return JSON.stringify(snapshot);
}

/**
 * Parse a cached library snapshot and reject corrupt or incompatible versions.
 */
export function deserializeSnapshot(raw: string): PersistedSnapshot | null {
  const decoded = Option.getOrNull(
    Schema.decodeUnknownOption(Schema.fromJsonString(PersistedSnapshotSchema))(raw),
  );
  if (decoded === null || decoded.version !== SNAPSHOT_VERSION) return null;
  return decoded;
}

/** Determine whether a persisted Steam library snapshot is still fresh. */
export function isSnapshotFresh(
  fetchedAtMs: number,
  nowMs: number,
  ttlMs: number = SNAPSHOT_TTL_MS,
): boolean {
  return nowMs - fetchedAtMs < ttlMs;
}
