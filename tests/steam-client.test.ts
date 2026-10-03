import { describe, expect, it } from "vitest";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Option from "effect/Option";
import * as Schema from "effect/Schema";
import { SteamIdSchema } from "@/lib/types";
import { layer as steamWebApiLayer } from "@/src/adapters/steam-web-api";
import * as SteamClient from "@/src/services/steam-client";

const STEAM_ID = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000001");

const ownedGamesBody = {
  response: {
    game_count: 1,
    games: [
      {
        appid: 1245620,
        name: "Elden Ring",
        playtime_forever: 7200,
        img_icon_url: "abc",
        img_logo_url: "def",
        has_community_visible_stats: true,
      },
    ],
  },
};

const summariesBody = {
  response: {
    players: [
      {
        steamid: "76561198000000001",
        personaname: "Dreadnought",
        avatar: "https://avatars.example/a.jpg",
        avatarmedium: "https://avatars.example/a_medium.jpg",
        avatarfull: "https://avatars.example/a_full.jpg",
        profileurl: "https://steamcommunity.com/id/dreadnought",
      },
    ],
  },
};

const runWithSteam = <A, E>(
  effect: Effect.Effect<A, E, SteamClient.Service>,
  fetchImpl: typeof globalThis.fetch,
) =>
  effect.pipe(
    Effect.provide(steamWebApiLayer),
    Effect.provideService(FetchHttpClient.Fetch, fetchImpl),
    Effect.provide(
      ConfigProvider.layer(
        ConfigProvider.fromUnknown({ STEAM_API_KEY: "test-steam-key" }),
      ),
    ),
  );

const jsonResponse = (body: Schema.Json, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("Steam Web API adapter", () => {
  it("parses owned games from a successful response", async () => {
    const urls: string[] = [];
    const fetchImpl: typeof globalThis.fetch = async (input) => {
      urls.push(String(input));
      return jsonResponse(ownedGamesBody);
    };

    const result = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getOwnedGames(STEAM_ID);
        }),
        fetchImpl,
      ),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.games).toHaveLength(1);
      expect(result.games[0]?.name).toBe("Elden Ring");
    }
    expect(urls[0]).toContain("key=test-steam-key");
    expect(urls[0]).toContain("include_played_free_games=true");
  });

  it("classifies a missing games array as a private profile", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({ response: {} });

    const result = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getOwnedGames(STEAM_ID);
        }),
        fetchImpl,
      ),
    );

    expect(result).toEqual({ ok: false, reason: "private_profile", status: 200 });
  });

  it("classifies an unexpected payload as an API error", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({ unexpected: true });

    const result = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getOwnedGames(STEAM_ID);
        }),
        fetchImpl,
      ),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("api_error");
    }
  });

  it("returns a typed failure when an endpoint responds with an error status", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({ error: "boom" }, 500);

    const result = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getPlayerAchievements(
            STEAM_ID,
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(1245620),
          );
        }),
        fetchImpl,
      ).pipe(Effect.result),
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure" && result.failure._tag === "SteamApiError") {
      expect(result.failure.status).toBe(500);
    } else {
      expect.unreachable("expected a SteamApiError");
    }
  });

  it("parses player summaries into branded Steam IDs", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse(summariesBody);

    const summaries = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getPlayerSummaries([STEAM_ID]);
        }),
        fetchImpl,
      ),
    );

    expect(summaries).toHaveLength(1);
    expect(summaries[0]?.steamId).toBe(STEAM_ID);
    expect(summaries[0]?.personaName).toBe("Dreadnought");
    expect(summaries[0]?.avatarFull).toBe("https://avatars.example/a_full.jpg");
  });

  it("skips malformed player summaries with a typed failure", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({
        response: { players: [{ steamid: "not-a-steam-id", personaname: "x" }] },
      });

    const result = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getPlayerSummaries([STEAM_ID]);
        }),
        fetchImpl,
      ).pipe(Effect.result),
    );

    expect(result._tag).toBe("Failure");
  });

  it("returns an empty summary list without calling Steam", async () => {
    let called = false;
    const fetchImpl: typeof globalThis.fetch = async () => {
      called = true;
      return jsonResponse(summariesBody);
    };

    const summaries = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getPlayerSummaries([]);
        }),
        fetchImpl,
      ),
    );

    expect(summaries).toEqual([]);
    expect(called).toBe(false);
  });

  it("indexes achievement schema metadata by API name", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({
        game: {
          gameName: "Elden Ring",
          gameVersion: "1",
          availableGameStats: {
            stats: [],
            achievements: [
              {
                name: "ELD_1",
                defaultvalue: 0,
                displayName: "Elden Lord",
                hidden: 0,
                description: "Defeat the final boss",
                icon: "https://cdn.example/icon.jpg",
                icongray: "https://cdn.example/icon_gray.jpg",
              },
            ],
          },
        },
      });

    const schema = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getGameAchievementSchema(
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(1245620),
          );
        }),
        fetchImpl,
      ),
    );

    expect(Option.isSome(Option.some(schema))).toBe(true);
    expect(schema.get("ELD_1")?.displayName).toBe("Elden Lord");
  });
  it("normalizes owned games when Steam omits optional fields", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({
        response: {
          game_count: 2,
          games: [
            {
              appid: 220,
              name: "Half-Life 2",
              playtime_forever: 0,
              img_icon_url: "icon",
              has_community_visible_stats: true,
            },
            { appid: 320, playtime_forever: 120, img_icon_url: "icon2" },
          ],
        },
      });

    const result = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getOwnedGames(STEAM_ID);
        }),
        fetchImpl,
      ),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [halfLife, omitted] = result.games;
    expect(halfLife).toMatchObject({
      appid: 220,
      name: "Half-Life 2",
      img_logo_url: "",
      has_community_visible_stats: true,
    });
    expect(omitted).toMatchObject({
      appid: 320,
      name: "App 320",
      img_logo_url: "",
      has_community_visible_stats: false,
    });
  });

  it("returns no achievements when Steam omits playerstats", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({ playerstats: {} });

    const achievements = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getPlayerAchievements(
            STEAM_ID,
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(1245620),
          );
        }),
        fetchImpl,
      ),
    );

    expect(achievements).toEqual([]);
  });

  it("returns no global percentages when Steam omits the envelope", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({ achievementpercentages: {} });

    const percentages = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getGlobalAchievementPercentages(
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(1245620),
          );
        }),
        fetchImpl,
      ),
    );

    expect(percentages).toEqual([]);
  });

  it("returns no friends when the friend list is hidden", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({ friendslist: {} });

    const friends = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getFriendIds(STEAM_ID);
        }),
        fetchImpl,
      ),
    );

    expect(friends).toEqual([]);
  });

  it("returns an empty schema map when a game has no achievement stats", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({ game: { gameName: "No Stats", gameVersion: "1" } });

    const schema = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getGameAchievementSchema(
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(1245620),
          );
        }),
        fetchImpl,
      ),
    );

    expect(schema.size).toBe(0);
  });
  it("decodes string achievement percentages from Steam's v2 endpoint", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({
        achievementpercentages: {
          achievements: [
            { name: "BG3_Quest01", percent: "89.1" },
            { name: "BG3_Quest10", percent: 65.3 },
          ],
        },
      });

    const percentages = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getGlobalAchievementPercentages(
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(1086940),
          );
        }),
        fetchImpl,
      ),
    );

    expect(percentages).toEqual([
      { name: "BG3_Quest01", percent: 89.1 },
      { name: "BG3_Quest10", percent: 65.3 },
    ]);
  });

  it("treats a 403 private game-details response as no achievement data", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      new Response(JSON.stringify({ playerstats: { error: "Profile is not public", success: false } }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });

    const achievements = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getPlayerAchievements(
            STEAM_ID,
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(240),
          );
        }),
        fetchImpl,
      ),
    );

    expect(achievements).toEqual([]);
  });

  it("reports a transport failure as a typed error without a status", async () => {
    const fetchImpl: typeof globalThis.fetch = async () => {
      throw new Error("network down");
    };

    const result = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getGlobalAchievementPercentages(
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(1086940),
          );
        }),
        fetchImpl,
      ).pipe(Effect.result),
    );

    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure" && result.failure._tag === "SteamApiError") {
      expect(result.failure.operation).toBe("getGlobalAchievementPercentages");
      expect("status" in result.failure).toBe(false);
    } else {
      expect.unreachable("expected a SteamApiError");
    }
  });
  it("normalizes hidden achievements that omit a description", async () => {
    const fetchImpl: typeof globalThis.fetch = async () =>
      jsonResponse({
        game: {
          gameName: "Cyberpunk 2077",
          gameVersion: "1",
          availableGameStats: {
            stats: [],
            achievements: [
              {
                name: "TheFool",
                defaultvalue: 0,
                displayName: "The Fool",
                hidden: 1,
                icon: "https://cdn.example/fool.jpg",
                icongray: "https://cdn.example/fool_gray.jpg",
              },
              {
                name: "NoDisplayName",
                defaultvalue: 0,
                hidden: 0,
                description: "Has a description but no display name",
              },
            ],
          },
        },
      });

    const schema = await Effect.runPromise(
      runWithSteam(
        Effect.gen(function* () {
          const steam = yield* SteamClient.Service;
          return yield* steam.getGameAchievementSchema(
            Schema.decodeUnknownSync(Schema.Int.pipe(Schema.brand("AppId")))(1091500),
          );
        }),
        fetchImpl,
      ),
    );

    expect(schema.get("TheFool")).toEqual({
      displayName: "The Fool",
      description: "",
      icon: "https://cdn.example/fool.jpg",
      icongray: "https://cdn.example/fool_gray.jpg",
    });
    expect(schema.get("NoDisplayName")).toEqual({
      displayName: "NoDisplayName",
      description: "Has a description but no display name",
      icon: "",
      icongray: "",
    });
  });
});
