import * as Schema from "effect/Schema";

/** Runtime schema for the dashboard's supported game-library filters. */
export const GameFilterSchema = Schema.Literals(["all", "owned", "tracked"]);

/** Filter applied when selecting games for dashboard views. */
export type GameFilter = typeof GameFilterSchema.Type;

/** Stable list of filter choices displayed by the dashboard. */
export const DASHBOARD_FILTERS = ["all", "owned", "tracked"] as const satisfies ReadonlyArray<GameFilter>;

/** Runtime schema for a validated Steam 64-bit account identifier. */
export const SteamIdSchema = Schema.String.pipe(
  Schema.check(Schema.isPattern(/^\d{17}$/)),
  Schema.brand("SteamId"),
);

/** Branded Steam account identifier parsed at an external boundary. */
export type SteamId = typeof SteamIdSchema.Type;

/** Runtime schema for a positive integer Steam application identifier. */
export const AppIdSchema = Schema.Int.pipe(
  Schema.check(Schema.isGreaterThan(0)),
  Schema.brand("AppId"),
);

/** Branded positive integer Steam application identifier. */
export type AppId = typeof AppIdSchema.Type;

/** Runtime schema for parsing a positive Steam application ID from a URL. */
export const AppIdFromStringSchema = Schema.NumberFromString.pipe(
  Schema.check(Schema.isInt(), Schema.isGreaterThan(0)),
  Schema.brand("AppId"),
);

/** Runtime schema for earned and total achievement counts. */
export const AchievementPairSchema = Schema.Struct({
  earned: Schema.Number,
  total: Schema.Number,
});

/** Achievement counts for one game. */
export type AchievementPair = typeof AchievementPairSchema.Type;

/** Runtime schema for a game's comparison with community completion. */
export const GameComparisonSchema = Schema.Struct({
  text: Schema.String,
  percent: Schema.Number,
  isPositive: Schema.Boolean,
});

/** Community-completion comparison presented for a game. */
export type GameComparison = typeof GameComparisonSchema.Type;

/** Runtime schema for the game data rendered throughout the dashboard. */
export const GameSchema = Schema.Struct({
  appId: Schema.Number,
  name: Schema.String,
  hours: Schema.Number,
  completion: Schema.Number,
  achievements: AchievementPairSchema,
  comparison: GameComparisonSchema,
  image: Schema.String,
  owned: Schema.Boolean,
  tracked: Schema.Boolean,
  unlocktimes: Schema.Array(Schema.Number),
});

/** Game summary returned to the React dashboard. */
export type Game = typeof GameSchema.Type;

/** Runtime schema for the dashboard's compact statistic cards. */
export const StatsSchema = Schema.Struct({
  achievementsEarned: Schema.Number,
  achievementsEarnedDelta: Schema.NullOr(Schema.Number),
  avgCompletion: Schema.Number,
  avgCompletionDelta: Schema.NullOr(Schema.Number),
  gamesOwned: Schema.Number,
  gamesOwnedDelta: Schema.NullOr(Schema.Number),
  gamesTracked: Schema.Number,
  perfectGames: Schema.Number,
});

/** Aggregate achievement and library statistics. */
export type Stats = typeof StatsSchema.Type;

/** Runtime schema for the expected Steam library-fetch errors. */
export const DashboardErrorSchema = Schema.NullOr(
  Schema.Struct({
    type: Schema.Literals(["private_profile", "api_error"]),
    status: Schema.optionalKey(Schema.Number),
  }),
);

/** Expected private-profile or Steam API error shown in the dashboard. */
export type DashboardError = typeof DashboardErrorSchema.Type;

/** Runtime schema for one unlocked achievement shown in activity views. */
export const RecentAchievementSchema = Schema.Struct({
  appId: Schema.Number,
  gameName: Schema.String,
  gameImage: Schema.String,
  name: Schema.String,
  description: Schema.optionalKey(Schema.String),
  icon: Schema.optionalKey(Schema.String),
  unlocktime: Schema.Number,
  globalPercent: Schema.optionalKey(Schema.Number),
});

/** Achievement event rendered in recent and rarity lists. */
export type RecentAchievement = typeof RecentAchievementSchema.Type;

/** Runtime schema for a game's achievement detail row. */
export const GameAchievementSchema = Schema.Struct({
  apiname: Schema.String,
  name: Schema.String,
  description: Schema.String,
  icon: Schema.String,
  icongray: Schema.String,
  achieved: Schema.Boolean,
  unlocktime: Schema.Number,
  globalPercent: Schema.Number,
});

/** Achievement detail rendered in a game's achievement list. */
export type GameAchievement = typeof GameAchievementSchema.Type;

/** Runtime schema for one rarity chart segment. */
export const RarityTierSchema = Schema.Struct({
  tier: Schema.String,
  count: Schema.Number,
  color: Schema.String,
});

/** Rarity bucket used by the dashboard charts. */
export type RarityTier = typeof RarityTierSchema.Type;

/** Runtime schema for the signed-in Steam profile summary. */
export const UserProfileSchema = Schema.Struct({
  personaName: Schema.String,
  avatar: Schema.String,
});

/** User profile fields presented in dashboard navigation and cards. */
export type UserProfile = typeof UserProfileSchema.Type;

/** Runtime schema for the overview dashboard response. */
export const DashboardDataSchema = Schema.Struct({
  stats: StatsSchema,
  games: Schema.Array(GameSchema),
  recentAchievements: Schema.Array(RecentAchievementSchema),
  rarestAchievements: Schema.Array(RecentAchievementSchema),
  rarityDistribution: Schema.Array(RarityTierSchema),
  error: DashboardErrorSchema,
  user: Schema.optionalKey(UserProfileSchema),
});

/** Data loaded by the dashboard overview screen. */
export type DashboardData = typeof DashboardDataSchema.Type;

/** Runtime schema for the user's default dashboard filter. */
export const UserPreferencesSchema = Schema.Struct({
  defaultFilter: GameFilterSchema,
});

/** Saved preferences that affect the signed-in user's dashboard. */
export type UserPreferences = typeof UserPreferencesSchema.Type;

/** Runtime schema for one game returned by Steam's owned-games API. */
export const SteamOwnedGameSchema = Schema.Struct({
  appid: Schema.Number,
  name: Schema.optionalKey(Schema.String),
  playtime_forever: Schema.Number,
  img_icon_url: Schema.optionalKey(Schema.String),
  img_logo_url: Schema.optionalKey(Schema.String),
  has_community_visible_stats: Schema.optionalKey(Schema.Boolean),
});

/**
 * Normalized owned-game record; Steam omits `img_logo_url` entirely and
 * `has_community_visible_stats` for games without community stats.
 */
export interface SteamOwnedGame {
  readonly appid: number;
  readonly name: string;
  readonly playtime_forever: number;
  readonly img_icon_url: string;
  readonly img_logo_url: string;
  readonly has_community_visible_stats: boolean;
}

/** Runtime schema for Steam's owned-games response envelope. */
export const SteamOwnedGamesResponseSchema = Schema.Struct({
  response: Schema.Struct({
    game_count: Schema.optionalKey(Schema.Number),
    games: Schema.optionalKey(Schema.Array(SteamOwnedGameSchema)),
  }),
});

/** Parsed response envelope from Steam's owned-games endpoint. */
export type SteamOwnedGamesResponse = typeof SteamOwnedGamesResponseSchema.Type;

/** Runtime schema for one player's achievement record from Steam. */
export const SteamPlayerAchievementSchema = Schema.Struct({
  apiname: Schema.String,
  achieved: Schema.Number,
  unlocktime: Schema.Number,
});

/** Parsed player-achievement record received from Steam. */
export type SteamPlayerAchievement = typeof SteamPlayerAchievementSchema.Type;

/** Runtime schema for Steam's per-player achievement response envelope. */
export const SteamPlayerAchievementsResponseSchema = Schema.Struct({
  playerstats: Schema.optionalKey(
    Schema.Struct({
      steamID: Schema.optionalKey(Schema.String),
      gameName: Schema.optionalKey(Schema.String),
      achievements: Schema.optionalKey(Schema.Array(SteamPlayerAchievementSchema)),
    }),
  ),
});

/** Parsed response envelope from Steam's per-player achievement endpoint. */
export type SteamPlayerAchievementsResponse = typeof SteamPlayerAchievementsResponseSchema.Type;

/** Runtime schema for a Steam-wide achievement completion percentage. */
export const SteamGlobalAchievementSchema = Schema.Struct({
  name: Schema.String,
  // Steam's v2 endpoint returns the percentage as a string ("89.1") while
  // older payloads used numbers, so accept both and decode to a number.
  percent: Schema.Union([Schema.FiniteFromString, Schema.Finite]),
});

/** Parsed global achievement percentage received from Steam. */
export type SteamGlobalAchievement = typeof SteamGlobalAchievementSchema.Type;

/** Runtime schema for Steam's global achievement response envelope. */
export const SteamGlobalAchievementsResponseSchema = Schema.Struct({
  achievementpercentages: Schema.optionalKey(
    Schema.Struct({
      achievements: Schema.optionalKey(Schema.Array(SteamGlobalAchievementSchema)),
    }),
  ),
});

/** Parsed response envelope from Steam's global-achievement endpoint. */
export type SteamGlobalAchievementsResponse = typeof SteamGlobalAchievementsResponseSchema.Type;

/** Runtime schema for one Steam player summary. */
export const SteamPlayerSummarySchema = Schema.Struct({
  steamid: Schema.String,
  personaname: Schema.String,
  avatar: Schema.String,
  avatarmedium: Schema.String,
  avatarfull: Schema.String,
  profileurl: Schema.String,
});

/** Parsed player summary received from Steam. */
export type SteamPlayerSummary = typeof SteamPlayerSummarySchema.Type;

/** Runtime schema for Steam's player-summaries response envelope. */
export const SteamPlayerSummariesResponseSchema = Schema.Struct({
  response: Schema.Struct({
    players: Schema.Array(SteamPlayerSummarySchema),
  }),
});

/** Parsed response envelope from Steam's player-summaries endpoint. */
export type SteamPlayerSummariesResponse = typeof SteamPlayerSummariesResponseSchema.Type;

/** Runtime schema for one Steam friend relationship. */
export const SteamFriendSchema = Schema.Struct({
  steamid: Schema.String,
  relationship: Schema.String,
  friend_since: Schema.Number,
});

/** Parsed friend relationship received from Steam. */
export type SteamFriend = typeof SteamFriendSchema.Type;

/** Runtime schema for Steam's friend-list response envelope. */
export const SteamFriendListResponseSchema = Schema.Struct({
  friendslist: Schema.optionalKey(
    Schema.Struct({
      friends: Schema.optionalKey(Schema.Array(SteamFriendSchema)),
    }),
  ),
});

/** Parsed response envelope from Steam's friend-list endpoint. */
export type SteamFriendListResponse = typeof SteamFriendListResponseSchema.Type;

/**
 * Runtime schema for a Steam achievement's localized schema details.
 *
 * Steam omits `description` for hidden achievements, so the adapter normalizes
 * every field before the value reaches application code.
 */
export const SteamSchemaAchievementSchema = Schema.Struct({
  name: Schema.String,
  defaultvalue: Schema.optionalKey(Schema.Number),
  displayName: Schema.optionalKey(Schema.String),
  hidden: Schema.optionalKey(Schema.Number),
  description: Schema.optionalKey(Schema.String),
  icon: Schema.optionalKey(Schema.String),
  icongray: Schema.optionalKey(Schema.String),
});

/** Parsed achievement schema record received from Steam. */
export type SteamSchemaAchievement = typeof SteamSchemaAchievementSchema.Type;

/** Runtime schema for Steam's game-achievement schema response envelope. */
export const SteamSchemaResponseSchema = Schema.Struct({
  game: Schema.optionalKey(
    Schema.Struct({
      gameName: Schema.optionalKey(Schema.String),
      gameVersion: Schema.optionalKey(Schema.String),
      availableGameStats: Schema.optionalKey(
        Schema.Struct({
          stats: Schema.optionalKey(Schema.Array(Schema.Unknown)),
          achievements: Schema.optionalKey(Schema.Array(SteamSchemaAchievementSchema)),
        }),
      ),
    }),
  ),
});

/** Parsed response envelope from Steam's game-achievement schema endpoint. */
export type SteamSchemaResponse = typeof SteamSchemaResponseSchema.Type;
