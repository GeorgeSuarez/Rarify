import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type { AppId, DashboardData, GameFilter, SteamId } from "../../lib/types.ts";
import type {
  AchievementsOverview,
  FriendComparison,
  FriendsData,
  GameAchievements,
} from "../domain/dashboard.ts";
import type { LibrarySnapshot } from "../domain/library.ts";
import type { PersistenceError } from "./rarify-store.ts";
import type { SteamApiError } from "./steam-client.ts";

/** Expected failures while loading dashboard data from D1 or Steam. */
export type DashboardServiceError = PersistenceError | SteamApiError;

/** Caller-facing dashboard read operations. */
export interface Interface {
  /** Load the overview data for one Steam account and selected filter. */
  readonly getDashboard: (
    steamId: SteamId,
    filter: GameFilter,
  ) => Effect.Effect<DashboardData, DashboardServiceError>;

  /** Load the enriched library for the games browser. */
  readonly getLibrary: (
    steamId: SteamId,
  ) => Effect.Effect<LibrarySnapshot, DashboardServiceError>;

  /** Load the full achievement overview. */
  readonly getAchievementsOverview: (
    steamId: SteamId,
  ) => Effect.Effect<AchievementsOverview, DashboardServiceError>;

  /** Load achievement details for one Steam game. */
  readonly getGameAchievements: (
    steamId: SteamId,
    appId: AppId,
  ) => Effect.Effect<GameAchievements, DashboardServiceError>;

  /** Load visible Steam friends and their privacy summary. */
  readonly getFriends: (
    steamId: SteamId,
  ) => Effect.Effect<FriendsData, DashboardServiceError>;

  /** Load an authenticated player's comparison with one Steam account. */
  readonly getFriendComparison: (
    steamId: SteamId,
    friendSteamId: SteamId,
  ) => Effect.Effect<FriendComparison, DashboardServiceError>;
}

/**
 * Effect service for dashboard read models and Steam-library enrichment.
 */
export class Service extends Context.Service<Service, Interface>()(
  "@rarify/DashboardService",
) {}
