import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpApiEndpoint from "effect/http-api/HttpApiEndpoint";
import * as HttpApiGroup from "effect/http-api/HttpApiGroup";
import * as HttpApiSchema from "effect/http-api/HttpApiSchema";
import * as Schema from "effect/Schema";
import {
  AppIdFromStringSchema,
  AppIdSchema,
  DashboardDataSchema,
  GameFilterSchema,
  SteamIdSchema,
  UserPreferencesSchema,
} from "../../lib/types.ts";
import {
  AchievementsOverviewSchema,
  FriendComparisonSchema,
  FriendsDataSchema,
  GameAchievementsSchema,
} from "../domain/dashboard.ts";
import { LibrarySnapshotSchema } from "../domain/library.ts";

/** HTTP 401 error returned when an endpoint requires a valid session. */
export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  { message: Schema.String },
) {}

/** HTTP 400 error returned when a request is outside its declared contract. */
export class InvalidRequestError extends Schema.TaggedError<InvalidRequestError>()(
  "InvalidRequestError",
  { message: Schema.String },
) {}

/** HTTP 500 error returned when an application operation cannot be completed. */
export class ApiFailure extends Schema.TaggedError<ApiFailure>()(
  "ApiFailure",
  { message: Schema.String },
) {}

/** Runtime schema for a tracking command response. */
export const TrackedGameResponseSchema = Schema.Struct({
  tracked: Schema.Boolean,
  appId: Schema.Number,
});

/** Runtime schema for the public authentication bootstrap response. */
export const SessionStatusSchema = Schema.Struct({
  authenticated: Schema.Boolean,
});

const standardErrors = [
  HttpApiSchema.status(401)(UnauthorizedError),
  HttpApiSchema.status(400)(InvalidRequestError),
  HttpApiSchema.status(500)(ApiFailure),
] as const;

const SessionGroup = HttpApiGroup.make("Session").add(
  HttpApiEndpoint.get("getSessionStatus", "/session", {
    success: SessionStatusSchema,
  }),
);

const DashboardGroup = HttpApiGroup.make("Dashboard").add(
  HttpApiEndpoint.get("getDashboard", "/dashboard", {
    query: Schema.Struct({
      filter: Schema.optionalKey(GameFilterSchema),
    }),
    success: DashboardDataSchema,
    error: standardErrors,
  }),
);

const LibraryGroup = HttpApiGroup.make("Library").add(
  HttpApiEndpoint.get("getGames", "/games", {
    success: LibrarySnapshotSchema,
    error: standardErrors,
  }),
  HttpApiEndpoint.get("getGameAchievements", "/games/:appId/achievements", {
    params: Schema.Struct({ appId: AppIdFromStringSchema }),
    success: GameAchievementsSchema,
    error: standardErrors,
  }),
);

const AchievementsGroup = HttpApiGroup.make("Achievements").add(
  HttpApiEndpoint.get("getAchievementsOverview", "/achievements", {
    success: AchievementsOverviewSchema,
    error: standardErrors,
  }),
);

const FriendsGroup = HttpApiGroup.make("Friends").add(
  HttpApiEndpoint.get("getFriends", "/friends", {
    success: FriendsDataSchema,
    error: standardErrors,
  }),
  HttpApiEndpoint.get("getFriendComparison", "/friends/:steamId", {
    params: Schema.Struct({ steamId: SteamIdSchema }),
    success: FriendComparisonSchema,
    error: standardErrors,
  }),
);

const PreferencesGroup = HttpApiGroup.make("Preferences").add(
  HttpApiEndpoint.get("getPreferences", "/settings", {
    success: UserPreferencesSchema,
    error: standardErrors,
  }),
  HttpApiEndpoint.put("savePreferences", "/settings", {
    payload: Schema.Struct({
      defaultFilter: Schema.optionalKey(GameFilterSchema),
    }),
    success: UserPreferencesSchema,
    error: standardErrors,
  }),
);

const TrackedGamesGroup = HttpApiGroup.make("TrackedGames").add(
  HttpApiEndpoint.post("trackGame", "/tracked-games", {
    payload: Schema.Struct({ appId: AppIdSchema }),
    success: TrackedGameResponseSchema,
    error: standardErrors,
  }),
  HttpApiEndpoint.delete("untrackGame", "/tracked-games", {
    query: Schema.Struct({ appId: AppIdFromStringSchema }),
    success: TrackedGameResponseSchema,
    error: standardErrors,
  }),
);

/**
 * Schema-validated API contract shared by the Cloudflare Worker and React SPA.
 *
 * Steam redirects and logout remain explicit HTTP routes because they return
 * redirects and set or clear an HTTP-only session cookie.
 */
export const RarifyApi = HttpApi.make("RarifyApi")
  .add(
    SessionGroup,
    DashboardGroup,
    LibraryGroup,
    AchievementsGroup,
    FriendsGroup,
    PreferencesGroup,
    TrackedGamesGroup,
  )
  .prefix("/api");
