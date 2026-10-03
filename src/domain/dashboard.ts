import * as Schema from "effect/Schema";
import {
  DashboardDataSchema,
  DashboardErrorSchema,
  GameAchievementSchema,
  GameSchema,
  RecentAchievementSchema,
  StatsSchema,
  SteamIdSchema,
  UserProfileSchema,
} from "../../lib/types.ts";

/** Runtime schema for one Steam friend visible in the application. */
export const FriendSummarySchema = Schema.Struct({
  steamId: SteamIdSchema,
  name: Schema.String,
  avatar: Schema.String,
  avatarFull: Schema.String,
  profileUrl: Schema.String,
});

/** Steam profile and URL data used by friends and comparison views. */
export type FriendSummary = typeof FriendSummarySchema.Type;

/** Runtime schema for the current user's visible Steam friends. */
export const FriendsDataSchema = Schema.Struct({
  friends: Schema.Array(FriendSummarySchema),
  error: DashboardErrorSchema,
  hiddenCount: Schema.Number,
});

/** Result of loading a user's Steam friends list. */
export type FriendsData = typeof FriendsDataSchema.Type;

/** Runtime schema for the achievements overview read model. */
export const AchievementsOverviewSchema = Schema.Struct({
  stats: StatsSchema,
  games: Schema.Array(GameSchema),
  recentAchievements: Schema.Array(RecentAchievementSchema),
  rarestAchievements: Schema.Array(RecentAchievementSchema),
  rarestPerGame: Schema.Array(
    Schema.Struct({
      appId: Schema.Number,
      gameName: Schema.String,
      achievement: RecentAchievementSchema,
    }),
  ),
  error: DashboardErrorSchema,
  user: Schema.optionalKey(UserProfileSchema),
});

/** Aggregated achievements shown on the achievements overview screen. */
export type AchievementsOverview = typeof AchievementsOverviewSchema.Type;

/** Runtime schema for the detailed achievements of one game. */
export const GameAchievementsSchema = Schema.Struct({
  gameName: Schema.String,
  gameImage: Schema.String,
  appId: Schema.Number,
  hours: Schema.Number,
  totalAchievements: Schema.Number,
  earnedAchievements: Schema.Number,
  completion: Schema.Number,
  achievements: Schema.Array(GameAchievementSchema),
  error: DashboardErrorSchema,
});

/** Per-game achievement data shown on a game's detail screen. */
export type GameAchievements = typeof GameAchievementsSchema.Type;

/** Runtime schema for the current player's comparison with one friend. */
export const FriendComparisonSchema = Schema.Struct({
  yourData: DashboardDataSchema,
  friendData: DashboardDataSchema,
  friendInfo: Schema.optionalKey(FriendSummarySchema),
});

/** Read model for a side-by-side Steam friend comparison. */
export type FriendComparison = typeof FriendComparisonSchema.Type;
