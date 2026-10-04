import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import type { GameFilter, SteamId, UserPreferences } from "../../lib/types.ts";
import type { PersistenceError } from "./rarify-store.ts";

/** Preference fields accepted from one settings update request. */
export interface SavePreferencesInput {
  readonly defaultFilter?: GameFilter;
}

/** User preference operations and their defaulting policy. */
export interface Interface {
  /** Load saved preferences, returning the documented default when absent. */
  readonly get: (steamId: SteamId) => Effect.Effect<UserPreferences, PersistenceError>;

  /** Save supplied preference fields and return the normalized saved value. */
  readonly save: (
    steamId: SteamId,
    input: SavePreferencesInput,
  ) => Effect.Effect<UserPreferences, PersistenceError>;
}

/**
 * Effect service for user settings and default-filter behavior.
 */
export class Service extends Context.Service<Service, Interface>()("@rarify/PreferencesService") {}
