import * as Cloudflare from "alchemy/Cloudflare";
import * as SQL from "alchemy/SQL/D1";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import {
  AppIdSchema,
  GameFilterSchema,
  SteamIdSchema,
} from "../../lib/types.ts";
import {
  GameAchievementCacheEntrySchema,
  GameAchievementSchemaMapSchema,
  PersistedSnapshotSchema,
  SNAPSHOT_VERSION,
  type PersistedSnapshot,
} from "../domain/library.ts";
import { Database } from "../database.ts";
import * as RarifyStore from "../services/rarify-store.ts";

const UserRowSchema = Schema.Struct({
  steamId: SteamIdSchema,
  personaName: Schema.String,
  avatar: Schema.NullOr(Schema.String),
});

const TrackedAppIdRowSchema = Schema.Struct({ appId: AppIdSchema });
const PreferencesRowSchema = Schema.Struct({ defaultFilter: GameFilterSchema });
const PreviousSnapshotRowSchema = Schema.Struct({
  achievementsEarned: Schema.Number,
  avgCompletion: Schema.Number,
  gamesOwned: Schema.Number,
});
const UserIdRowSchema = Schema.Struct({ steamId: SteamIdSchema });
const GameAchievementRowSchema = Schema.Struct({
  appId: AppIdSchema,
  payload: Schema.String,
  fetchedAt: Schema.Number,
});
const GameSchemaRowSchema = Schema.Struct({
  appId: AppIdSchema,
  payload: Schema.String,
  fetchedAt: Schema.Number,
});

const mapPersistenceError = (operation: string) =>
  Effect.mapError(
    (cause: unknown) =>
      new RarifyStore.PersistenceError({
        operation,
        message: `Rarify D1 operation failed: ${operation}`,
        cause,
      }),
  );

const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  return RarifyStore.Service.of({
    getUserProfile: Effect.fn("RarifyStore.getUserProfile")(function* (steamId) {
      const rows = yield* sql<{ steamId: string; personaName: string; avatar: string | null }>`
        SELECT steam_id AS steamId, persona_name AS personaName, avatar
        FROM users
        WHERE steam_id = ${steamId}
        LIMIT 1
      `.pipe(mapPersistenceError("getUserProfile"));

      const row = rows[0];
      if (row === undefined) return Option.none();

      const decoded = yield* Schema.decodeUnknownEffect(UserRowSchema)(row).pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "getUserProfile",
            message: "Rarify D1 row could not be decoded: getUserProfile",
            cause,
          }),
        ),
      );
      if (decoded.avatar === null) return Option.none();

      return Option.some({
        personaName: decoded.personaName,
        avatar: decoded.avatar,
      });
    }),

    saveUserProfile: Effect.fn("RarifyStore.saveUserProfile")(function* (
      steamId,
      profile,
    ) {
      const now = yield* Clock.currentTimeMillis;
      yield* sql`
        INSERT INTO users (steam_id, persona_name, avatar, created_at, updated_at)
        VALUES (${steamId}, ${profile.personaName}, ${profile.avatar}, ${now}, ${now})
        ON CONFLICT (steam_id) DO UPDATE SET
          persona_name = excluded.persona_name,
          avatar = excluded.avatar,
          updated_at = excluded.updated_at
      `.pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "saveUserProfile",
            message: "Rarify D1 operation failed: saveUserProfile",
            cause,
          }),
        ),
        Effect.asVoid,
      );
    }),

    getTrackedAppIds: Effect.fn("RarifyStore.getTrackedAppIds")(function* (
      steamId,
    ) {
      const rows = yield* sql<{ appId: number }>`
        SELECT app_id AS appId
        FROM tracked_games
        WHERE steam_id = ${steamId}
      `.pipe(mapPersistenceError("getTrackedAppIds"));

      return yield* Effect.forEach(rows, (row) =>
        Schema.decodeUnknownEffect(TrackedAppIdRowSchema)(row).pipe(
          Effect.mapError((cause) =>
            new RarifyStore.PersistenceError({
              operation: "getTrackedAppIds",
              message: "Rarify D1 row could not be decoded: getTrackedAppIds",
              cause,
            }),
          ),
          Effect.map((decoded) => decoded.appId),
        ),
      );
    }),

    trackGame: Effect.fn("RarifyStore.trackGame")(function* (steamId, appId) {
      const now = yield* Clock.currentTimeMillis;
      yield* sql`
        INSERT INTO tracked_games (steam_id, app_id, tracked_at)
        VALUES (${steamId}, ${appId}, ${now})
        ON CONFLICT (steam_id, app_id) DO NOTHING
      `.pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "trackGame",
            message: "Rarify D1 operation failed: trackGame",
            cause,
          }),
        ),
        Effect.asVoid,
      );
    }),

    untrackGame: Effect.fn("RarifyStore.untrackGame")(function* (
      steamId,
      appId,
    ) {
      yield* sql`
        DELETE FROM tracked_games
        WHERE steam_id = ${steamId} AND app_id = ${appId}
      `.pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "untrackGame",
            message: "Rarify D1 operation failed: untrackGame",
            cause,
          }),
        ),
        Effect.asVoid,
      );
    }),

    getPreferences: Effect.fn("RarifyStore.getPreferences")(function* (steamId) {
      const rows = yield* sql<{ defaultFilter: string }>`
        SELECT default_filter AS defaultFilter
        FROM user_preferences
        WHERE steam_id = ${steamId}
        LIMIT 1
      `.pipe(mapPersistenceError("getPreferences"));

      const row = rows[0];
      if (row === undefined) return { defaultFilter: "all" as const };

      const decoded = yield* Schema.decodeUnknownEffect(PreferencesRowSchema)(row).pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "getPreferences",
            message: "Rarify D1 row could not be decoded: getPreferences",
            cause,
          }),
        ),
      );
      return { defaultFilter: decoded.defaultFilter };
    }),

    savePreferences: Effect.fn("RarifyStore.savePreferences")(function* (
      steamId,
      preferences,
    ) {
      const now = yield* Clock.currentTimeMillis;
      return yield* sql`
        INSERT INTO user_preferences (steam_id, default_filter, updated_at)
        VALUES (${steamId}, ${preferences.defaultFilter}, ${now})
        ON CONFLICT (steam_id) DO UPDATE SET
          default_filter = excluded.default_filter,
          updated_at = excluded.updated_at
      `.pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "savePreferences",
            message: "Rarify D1 operation failed: savePreferences",
            cause,
          }),
        ),
        Effect.as(preferences),
      );
    }),

    getCachedLibrary: Effect.fn("RarifyStore.getCachedLibrary")(function* (
      steamId,
    ) {
      const rows = yield* sql<{ payload: string }>`
        SELECT payload
        FROM library_snapshots
        WHERE steam_id = ${steamId}
        LIMIT 1
      `.pipe(mapPersistenceError("getCachedLibrary"));

      const row = rows[0];
      if (row === undefined) return Option.none();

      const decoded = Option.getOrNull(
        Schema.decodeUnknownOption(Schema.fromJsonString(PersistedSnapshotSchema))(
          row.payload,
        ),
      );
      if (decoded === null || decoded.version !== SNAPSHOT_VERSION) {
        return Option.none();
      }
      return Option.some(decoded);
    }),

    saveCachedLibrary: Effect.fn("RarifyStore.saveCachedLibrary")(function* (
      steamId,
      snapshot,
      fetchedAtMs,
    ) {
      // Omit the profile key when absent so the encoded cache payload matches
      // the `optionalKey` schema instead of carrying `undefined`.
      const persisted: PersistedSnapshot =
        snapshot.user === undefined
          ? {
              version: SNAPSHOT_VERSION,
              fetchedAtMs,
              games: snapshot.games,
              earnedEntries: snapshot.earnedEntries,
            }
          : {
              version: SNAPSHOT_VERSION,
              fetchedAtMs,
              games: snapshot.games,
              earnedEntries: snapshot.earnedEntries,
              user: snapshot.user,
            };
      const payload = Schema.encodeSync(Schema.fromJsonString(PersistedSnapshotSchema))(persisted);
      yield* sql`
        INSERT INTO library_snapshots (steam_id, version, payload, fetched_at)
        VALUES (${steamId}, ${persisted.version}, ${payload}, ${persisted.fetchedAtMs})
        ON CONFLICT (steam_id) DO UPDATE SET
          version = excluded.version,
          payload = excluded.payload,
          fetched_at = excluded.fetched_at
      `.pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "saveCachedLibrary",
            message: "Rarify D1 operation failed: saveCachedLibrary",
            cause,
          }),
        ),
        Effect.asVoid,
      );
    }),

    getPreviousSnapshot: Effect.fn("RarifyStore.getPreviousSnapshot")(function* (
      steamId,
      beforeDate,
    ) {
      const rows = yield* sql<{
        achievementsEarned: number;
        avgCompletion: number;
        gamesOwned: number;
      }>`
        SELECT
          achievements_earned AS achievementsEarned,
          avg_completion AS avgCompletion,
          games_owned AS gamesOwned
        FROM snapshots
        WHERE steam_id = ${steamId} AND date < ${beforeDate}
        ORDER BY date DESC
        LIMIT 1
      `.pipe(mapPersistenceError("getPreviousSnapshot"));

      const row = rows[0];
      if (row === undefined) return Option.none();

      const decoded = yield* Schema.decodeUnknownEffect(
        PreviousSnapshotRowSchema,
      )(row).pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "getPreviousSnapshot",
            message: "Rarify D1 row could not be decoded: getPreviousSnapshot",
            cause,
          }),
        ),
      );
      return Option.some({
        achievementsEarned: decoded.achievementsEarned,
        avgCompletion: decoded.avgCompletion / 10,
        gamesOwned: decoded.gamesOwned,
      });
    }),

    recordDailySnapshot: Effect.fn("RarifyStore.recordDailySnapshot")(function* (
      steamId,
      date,
      stats,
    ) {
      yield* sql`
        INSERT INTO snapshots (
          steam_id, date, achievements_earned, avg_completion, games_owned
        )
        VALUES (
          ${steamId}, ${date}, ${stats.achievementsEarned},
          ${Math.round(stats.avgCompletion * 10)}, ${stats.gamesOwned}
        )
        ON CONFLICT (steam_id, date) DO UPDATE SET
          achievements_earned = excluded.achievements_earned,
          avg_completion = excluded.avg_completion,
          games_owned = excluded.games_owned
      `.pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "recordDailySnapshot",
            message: "Rarify D1 operation failed: recordDailySnapshot",
            cause,
          }),
        ),
        Effect.asVoid,
      );
    }),

    listUserSteamIds: Effect.fn("RarifyStore.listUserSteamIds")(function* () {
      const rows = yield* sql<{ steamId: string }>`
        SELECT steam_id AS steamId
        FROM users
        ORDER BY steam_id
      `.pipe(mapPersistenceError("listUserSteamIds"));

      return yield* Effect.forEach(rows, (row) =>
        Schema.decodeUnknownEffect(UserIdRowSchema)(row).pipe(
          Effect.mapError((cause) =>
            new RarifyStore.PersistenceError({
              operation: "listUserSteamIds",
              message: "Rarify D1 row could not be decoded: listUserSteamIds",
              cause,
            }),
          ),
          Effect.map((decoded) => decoded.steamId),
        ),
      );
    }),

    getGameAchievementCache: Effect.fn("RarifyStore.getGameAchievementCache")(
      function* (steamId) {
        const rows = yield* sql<{
          appId: number;
          payload: string;
          fetchedAt: number;
        }>`
          SELECT app_id AS appId, payload, fetched_at AS fetchedAt
          FROM game_achievements
          WHERE steam_id = ${steamId}
        `.pipe(mapPersistenceError("getGameAchievementCache"));

        const entries = new Map<
          number,
          RarifyStore.GameAchievementCacheRead
        >();
        for (const row of rows) {
          const decoded = yield* Schema.decodeUnknownEffect(
            GameAchievementRowSchema,
          )(row).pipe(
            Effect.mapError((cause) =>
              new RarifyStore.PersistenceError({
                operation: "getGameAchievementCache",
                message: "Rarify D1 row could not be decoded: getGameAchievementCache",
                cause,
              }),
            ),
          );
          const entry = Option.getOrNull(
            Schema.decodeUnknownOption(
              Schema.fromJsonString(GameAchievementCacheEntrySchema),
            )(decoded.payload),
          );
          if (entry === null) {
            // A cache row written by an older payload version is treated as a
            // miss so the game is re-fetched rather than failing the request.
            yield* Effect.logWarning(
              "Discarding incompatible cached achievement data",
            ).pipe(Effect.annotateLogs({ appId: String(decoded.appId) }));
            continue;
          }
          entries.set(decoded.appId, {
            entry,
            fetchedAtMs: decoded.fetchedAt,
          });
        }
        return entries;
      },
    ),

    saveGameAchievementCache: Effect.fn(
      "RarifyStore.saveGameAchievementCache",
    )(function* (steamId, entries) {
      if (entries.length === 0) return;
      // `sql.insert` compiles the whole column/value clause, so the record keys
      // are the physical column names.
      const encoded = entries.map(({ appId, entry, fetchedAtMs }) => ({
        steam_id: steamId,
        app_id: appId,
        payload: Schema.encodeSync(
          Schema.fromJsonString(GameAchievementCacheEntrySchema),
        )(entry),
        fetched_at: fetchedAtMs,
      }));
      yield* sql`
        INSERT INTO game_achievements ${sql.insert(encoded)}
        ON CONFLICT (steam_id, app_id) DO UPDATE SET
          payload = excluded.payload,
          fetched_at = excluded.fetched_at
      `.pipe(
        Effect.mapError((cause) =>
          new RarifyStore.PersistenceError({
            operation: "saveGameAchievementCache",
            message: "Rarify D1 operation failed: saveGameAchievementCache",
            cause,
          }),
        ),
        Effect.asVoid,
      );
    }),

    getGameSchemaCache: Effect.fn("RarifyStore.getGameSchemaCache")(
      function* (appIds) {
        if (appIds.length === 0) return new Map<number, RarifyStore.GameSchemaCacheRead>();
        const rows = yield* sql<{
          appId: number;
          payload: string;
          fetchedAt: number;
        }>`
          SELECT app_id AS appId, payload, fetched_at AS fetchedAt
          FROM game_schemas
          WHERE app_id IN ${sql.in(appIds)}
        `.pipe(mapPersistenceError("getGameSchemaCache"));

        const entries = new Map<number, RarifyStore.GameSchemaCacheRead>();
        for (const row of rows) {
          const decoded = yield* Schema.decodeUnknownEffect(
            GameSchemaRowSchema,
          )(row).pipe(
            Effect.mapError((cause) =>
              new RarifyStore.PersistenceError({
                operation: "getGameSchemaCache",
                message: "Rarify D1 row could not be decoded: getGameSchemaCache",
                cause,
              }),
            ),
          );
          const schema = Option.getOrNull(
            Schema.decodeUnknownOption(
              Schema.fromJsonString(GameAchievementSchemaMapSchema),
            )(decoded.payload),
          );
          if (schema === null) {
            // A schema row written by an older payload version is treated as
            // a miss so the game is re-fetched rather than failing the request.
            yield* Effect.logWarning(
              "Discarding incompatible cached schema data",
            ).pipe(Effect.annotateLogs({ appId: String(decoded.appId) }));
            continue;
          }
          entries.set(decoded.appId, {
            schema,
            fetchedAtMs: decoded.fetchedAt,
          });
        }
        return entries;
      },
    ),

    saveGameSchemaCache: Effect.fn("RarifyStore.saveGameSchemaCache")(
      function* (entries) {
        if (entries.length === 0) return;
        // `sql.insert` compiles the whole column/value clause, so the record
        // keys are the physical column names.
        const encoded = entries.map(({ appId, schema, fetchedAtMs }) => ({
          app_id: appId,
          payload: Schema.encodeSync(
            Schema.fromJsonString(GameAchievementSchemaMapSchema),
          )(schema),
          fetched_at: fetchedAtMs,
        }));
        yield* sql`
          INSERT INTO game_schemas ${sql.insert(encoded)}
          ON CONFLICT (app_id) DO UPDATE SET
            payload = excluded.payload,
            fetched_at = excluded.fetched_at
        `.pipe(
          Effect.mapError((cause) =>
            new RarifyStore.PersistenceError({
              operation: "saveGameSchemaCache",
              message: "Rarify D1 operation failed: saveGameSchemaCache",
              cause,
            }),
          ),
          Effect.asVoid,
        );
      },
    ),
  });
});

const layerWithoutDependencies = Layer.effect(RarifyStore.Service, make);

/**
 * Provide the D1-backed implementation of the Rarify persistence capability.
 *
 * @param database - Alchemy's typed D1 binding for the application database.
 * @returns A Layer that provides `RarifyStore.Service` using Effect SQL.
 */
export const layerForD1 = (
  database: Cloudflare.D1.QueryDatabaseClient,
): Layer.Layer<RarifyStore.Service> =>
  layerWithoutDependencies.pipe(Layer.provide(SQL.D1Layer(database)));

/**
 * Resolve the D1 binding and expose a Layer for the Rarify persistence service.
 *
 * @returns A Layer requiring the Worker D1 binding and providing the store.
 */
export const layer = Layer.unwrap(
  Effect.gen(function* () {
    const database = yield* Cloudflare.D1.QueryDatabase(Database);
    return layerForD1(database);
  }),
);
