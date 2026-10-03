import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type {
  AppId,
  SteamGlobalAchievement,
  SteamId,
  SteamOwnedGame,
  SteamPlayerAchievement,
  SteamSchemaAchievement,
} from "../../lib/types.ts";

/** Steam profile summary parsed into the identifiers the application uses. */
export interface ProfileSummary {
  readonly steamId: SteamId;
  readonly personaName: string;
  readonly avatar: string;
  readonly avatarFull: string;
  readonly profileUrl: string;
}

/** Typed failure from Steam Web API transport, status, or response decoding. */
export class SteamApiError extends Schema.TaggedError<SteamApiError>()(
  "SteamApiError",
  {
    operation: Schema.String,
    message: Schema.String,
    status: Schema.optionalKey(Schema.Number),
    cause: Schema.Defect(),
  },
) {}

/** Expected outcome of reading a player's owned Steam games. */
export type OwnedGamesResult =
  | { readonly ok: true; readonly games: ReadonlyArray<SteamOwnedGame> }
  | {
      readonly ok: false;
      readonly reason: "private_profile" | "api_error";
      readonly status: number | null;
    };

/** Steam Web API capabilities required by the dashboard. */
export interface Interface {
  /** Load a player's games and distinguish a private profile from API failure. */
  readonly getOwnedGames: (steamId: SteamId) => Effect.Effect<OwnedGamesResult, SteamApiError>;

  /** Load per-player achievement unlock states for one game. */
  readonly getPlayerAchievements: (
    steamId: SteamId,
    appId: AppId,
  ) => Effect.Effect<ReadonlyArray<SteamPlayerAchievement>, SteamApiError>;

  /** Load global achievement percentages for one game. */
  readonly getGlobalAchievementPercentages: (
    appId: AppId,
  ) => Effect.Effect<ReadonlyArray<SteamGlobalAchievement>, SteamApiError>;

  /** Load profile summaries for a batch of Steam accounts. */
  readonly getPlayerSummaries: (
    steamIds: ReadonlyArray<SteamId>,
  ) => Effect.Effect<ReadonlyArray<ProfileSummary>, SteamApiError>;

  /** Load a player's friend IDs. */
  readonly getFriendIds: (
    steamId: SteamId,
  ) => Effect.Effect<ReadonlyArray<SteamId>, SteamApiError>;

  /** Load localized achievement metadata for one game, indexed by API name. */
  readonly getGameAchievementSchema: (
    appId: AppId,
  ) => Effect.Effect<
    ReadonlyMap<
      string,
      Pick<SteamSchemaAchievement, "displayName" | "description" | "icon" | "icongray">
    >,
    SteamApiError
  >;
}

/**
 * Effect service for Steam Web API calls used by application services.
 *
 * @returns A requirement that must be provided by a Steam client Layer.
 */
export class Service extends Context.Service<Service, Interface>()(
  "@rarify/SteamClient",
) {}
