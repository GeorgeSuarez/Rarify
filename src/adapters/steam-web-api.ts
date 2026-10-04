import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import {
  SteamFriendListResponseSchema,
  SteamGlobalAchievementsResponseSchema,
  SteamOwnedGamesResponseSchema,
  SteamPlayerAchievementsResponseSchema,
  SteamPlayerSummariesResponseSchema,
  SteamOwnedGameSchema,
  SteamSchemaResponseSchema,
  SteamIdSchema,
  type SteamOwnedGame,
  type SteamSchemaAchievement,
} from "../../lib/types.ts";
import * as SteamClient from "../services/steam-client.ts";

const STEAM_API_BASE = "https://api.steampowered.com";

const PRIVATE_PROFILE_MESSAGE = "Profile is not public";

type SteamFetchResult<A> =
  | { readonly ok: true; readonly data: A }
  | {
      readonly ok: false;
      readonly status: number;
      readonly privateProfile: boolean;
    };

function makeSteamError(
  operation: string,
  cause: unknown,
  status?: number,
): SteamClient.SteamApiError {
  const fields = {
    operation,
    message: `Steam API operation failed: ${operation}`,
    cause,
  };

  // `optionalKey` means the key must be absent, not `undefined`, when Steam
  // did not report an HTTP status.
  return status === undefined
    ? new SteamClient.SteamApiError(fields)
    : new SteamClient.SteamApiError({ ...fields, status });
}

function steamUrl(
  apiKey: Redacted.Redacted<string>,
  endpoint: string,
  parameters: Readonly<Record<string, string>>,
): URL {
  const url = new URL(endpoint, STEAM_API_BASE);
  url.searchParams.set("key", Redacted.value(apiKey));

  for (const [name, value] of Object.entries(parameters)) {
    url.searchParams.set(name, value);
  }

  return url;
}

function fetchSteamJson<S extends Schema.Constraint>(
  httpClient: HttpClient.HttpClient,
  operation: string,
  url: URL,
  schema: S,
): Effect.Effect<SteamFetchResult<S["Type"]>, SteamClient.SteamApiError, S["DecodingServices"]> {
  return Effect.gen(function* () {
    const response = yield* httpClient
      .execute(HttpClientRequest.get(url))
      .pipe(Effect.mapError((cause) => makeSteamError(operation, cause)));

    if (response.status < 200 || response.status >= 300) {
      const body = yield* response.text.pipe(Effect.catch(() => Effect.succeed("")));

      return {
        ok: false,
        status: response.status,
        privateProfile: response.status === 403 && body.includes(PRIVATE_PROFILE_MESSAGE),
      };
    }

    const body = yield* response.json.pipe(
      Effect.mapError((cause) => makeSteamError(operation, cause, response.status)),
    );

    const data = yield* Schema.decodeUnknownEffect(schema)(body).pipe(
      Effect.mapError((cause) => makeSteamError(operation, cause, response.status)),
    );

    return { ok: true, data };
  });
}

function failSteamStatus(
  operation: string,
  status: number,
): Effect.Effect<never, SteamClient.SteamApiError> {
  return Effect.fail(
    new SteamClient.SteamApiError({
      operation,
      message: `Steam API returned HTTP ${status} during ${operation}`,
      status,
      cause: new Error(`Steam API returned HTTP ${status}`),
    }),
  );
}

/**
 * Normalize Steam's owned-game payload into the domain record.
 *
 * Steam omits `img_logo_url` for every game and `has_community_visible_stats`
 * for games without community stats, and occasionally omits the display name.
 *
 * @param game - Decoded wire record from Steam's owned-games endpoint.
 * @returns A game record with every domain field present.
 */
function normalizeOwnedGame(game: typeof SteamOwnedGameSchema.Type): SteamOwnedGame {
  return {
    appid: game.appid,
    name: game.name ?? `App ${game.appid}`,
    playtime_forever: game.playtime_forever,
    img_icon_url: game.img_icon_url ?? "",
    img_logo_url: game.img_logo_url ?? "",
    has_community_visible_stats: game.has_community_visible_stats ?? false,
  };
}

/** Construct the Effect implementation of the Steam Web API capability. */
const make = Effect.gen(function* () {
  const apiKey = yield* Config.Redacted("STEAM_API_KEY");
  const httpClient = yield* HttpClient.HttpClient;

  const request = <S extends Schema.Constraint>(
    operation: string,
    endpoint: string,
    parameters: Readonly<Record<string, string>>,
    schema: S,
  ) => fetchSteamJson(httpClient, operation, steamUrl(apiKey, endpoint, parameters), schema);

  return SteamClient.Service.of({
    getOwnedGames: Effect.fn("SteamClient.getOwnedGames")(function* (steamId) {
      const result = yield* request(
        "getOwnedGames",
        "/IPlayerService/GetOwnedGames/v1/",
        {
          steamid: steamId,
          include_appinfo: "true",
          include_played_free_games: "true",
        },
        SteamOwnedGamesResponseSchema,
      ).pipe(
        // The dashboard distinguishes a private profile from a transient or
        // malformed API response, so transport and decode failures become the
        // API-error variant instead of failing the whole read.
        Effect.catchTag("SteamApiError", (error) =>
          Effect.succeed({
            ok: false as const,
            status: error.status,
            privateProfile: false,
          }),
        ),
      );

      if (!result.ok) {
        return {
          ok: false,
          reason: result.privateProfile ? "private_profile" : "api_error",
          status: result.status ?? null,
        } as const;
      }

      const games = result.data.response.games;

      if (games === undefined) {
        return { ok: false, reason: "private_profile", status: 200 } as const;
      }

      return { ok: true, games: games.map(normalizeOwnedGame) } as const;
    }),

    getPlayerAchievements: Effect.fn("SteamClient.getPlayerAchievements")(
      function* (steamId, appId) {
        const result = yield* request(
          "getPlayerAchievements",
          "/ISteamUserStats/GetPlayerAchievements/v1/",
          { steamid: steamId, appid: String(appId) },
          SteamPlayerAchievementsResponseSchema,
        );

        if (!result.ok) {
          // Steam answers 403 with "Profile is not public" when the account's
          // game details are private; that is ordinary absence of achievement
          // data, not an integration failure.
          if (result.privateProfile) return [];

          return yield* failSteamStatus("getPlayerAchievements", result.status);
        }

        return result.data.playerstats?.achievements ?? [];
      },
    ),

    getGlobalAchievementPercentages: Effect.fn("SteamClient.getGlobalAchievementPercentages")(
      function* (appId) {
        const result = yield* request(
          "getGlobalAchievementPercentages",
          "/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
          { gameid: String(appId) },
          SteamGlobalAchievementsResponseSchema,
        );

        if (!result.ok) {
          return yield* failSteamStatus("getGlobalAchievementPercentages", result.status);
        }

        return result.data.achievementpercentages?.achievements ?? [];
      },
    ),

    getPlayerSummaries: Effect.fn("SteamClient.getPlayerSummaries")(function* (steamIds) {
      if (steamIds.length === 0) return [];

      const result = yield* request(
        "getPlayerSummaries",
        "/ISteamUser/GetPlayerSummaries/v2/",
        { steamids: steamIds.join(",") },
        SteamPlayerSummariesResponseSchema,
      );

      if (!result.ok) return yield* failSteamStatus("getPlayerSummaries", result.status);

      return yield* Effect.forEach(result.data.response.players, (player) =>
        Schema.decodeUnknownEffect(SteamIdSchema)(player.steamid).pipe(
          Effect.mapError((cause) => makeSteamError("parsePlayerSteamId", cause)),
          Effect.map(
            (steamId) =>
              ({
                steamId,
                personaName: player.personaname,
                avatar: player.avatar,
                avatarFull: player.avatarfull,
                profileUrl: player.profileurl,
              }) satisfies SteamClient.ProfileSummary,
          ),
        ),
      );
    }),

    getFriendIds: Effect.fn("SteamClient.getFriendIds")(function* (steamId) {
      const result = yield* request(
        "getFriendIds",
        "/ISteamUser/GetFriendList/v1/",
        { steamid: steamId, relationship: "friend" },
        SteamFriendListResponseSchema,
      );

      if (!result.ok) return yield* failSteamStatus("getFriendIds", result.status);

      const friends = result.data.friendslist?.friends ?? [];

      return yield* Effect.forEach(friends, (friend) =>
        Schema.decodeUnknownEffect(SteamIdSchema)(friend.steamid).pipe(
          Effect.mapError((cause) => makeSteamError("parseFriendSteamId", cause)),
        ),
      );
    }),

    getGameAchievementSchema: Effect.fn("SteamClient.getGameAchievementSchema")(function* (appId) {
      const result = yield* request(
        "getGameAchievementSchema",
        "/ISteamUserStats/GetSchemaForGame/v2/",
        { appid: String(appId), l: "english" },
        SteamSchemaResponseSchema,
      );

      if (!result.ok) return yield* failSteamStatus("getGameAchievementSchema", result.status);

      const metadata = new Map<
        string,
        Pick<SteamSchemaAchievement, "displayName" | "description" | "icon" | "icongray">
      >();

      const achievements = result.data.game?.availableGameStats?.achievements ?? [];

      for (const achievement of achievements) {
        // Hidden achievements have no description and some games omit the
        // display name or icons; normalize so callers always see strings.
        metadata.set(achievement.name, {
          displayName: achievement.displayName ?? achievement.name,
          description: achievement.description ?? "",
          icon: achievement.icon ?? "",
          icongray: achievement.icongray ?? "",
        });
      }

      return metadata;
    }),
  });
});

const layerWithoutDependencies = Layer.effect(SteamClient.Service, make);

/**
 * Production Steam Web API client Layer using the Worker Fetch implementation.
 */
export const layer = layerWithoutDependencies.pipe(Layer.provide(FetchHttpClient.layer));
