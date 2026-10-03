import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import {
  AppIdFromStringSchema,
  SteamIdSchema,
  type AppId,
  type SteamId,
} from "../../lib/types.ts";

/**
 * Parse the `:appId` route parameter into the domain application identifier.
 *
 * @param value - Raw route parameter from React Router.
 * @returns The branded application ID, or `null` when the URL is invalid.
 */
export function appIdFromRouteParam(value: string | undefined): AppId | null {
  if (value === undefined) return null;
  return Option.getOrNull(Schema.decodeUnknownOption(AppIdFromStringSchema)(value));
}

/**
 * Parse the `:steamId` route parameter into the domain Steam identifier.
 *
 * @param value - Raw route parameter from React Router.
 * @returns The branded Steam ID, or `null` when the URL is invalid.
 */
export function steamIdFromRouteParam(value: string | undefined): SteamId | null {
  if (value === undefined) return null;
  return Option.getOrNull(Schema.decodeUnknownOption(SteamIdSchema)(value));
}
