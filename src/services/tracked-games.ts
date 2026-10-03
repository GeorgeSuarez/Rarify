import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type { AppId, SteamId } from "../../lib/types.ts";
import type { PersistenceError } from "./rarify-store.ts";

/** Tracked-game operations authorized to one signed-in Steam account. */
export interface Interface {
  /** Pin a game for the current account; repeating the request is safe. */
  readonly track: (
    steamId: SteamId,
    appId: AppId,
  ) => Effect.Effect<void, PersistenceError>;

  /** Remove a pinned game for the current account; repeating is safe. */
  readonly untrack: (
    steamId: SteamId,
    appId: AppId,
  ) => Effect.Effect<void, PersistenceError>;
}

/**
 * Effect service for tracked-game state and per-account ownership policy.
 */
export class Service extends Context.Service<Service, Interface>()(
  "@rarify/TrackedGamesService",
) {}
