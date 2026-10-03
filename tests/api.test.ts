import { describe, expect, it, beforeAll, afterAll } from "vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import * as HttpRouter from "effect/http/HttpRouter";
import { handlersLayer } from "@/src/api/handlers";
import * as DashboardService from "@/src/services/dashboard";
import * as PreferencesService from "@/src/services/preferences";
import * as SessionService from "@/src/services/session";
import * as TrackedGamesService from "@/src/services/tracked-games";
import { SteamIdSchema } from "@/lib/types";

const STEAM_ID = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000001");

const emptyDashboardData = {
  stats: {
    achievementsEarned: 0,
    achievementsEarnedDelta: 0,
    avgCompletion: 0,
    avgCompletionDelta: null,
    gamesOwned: 0,
    gamesOwnedDelta: null,
    gamesTracked: 0,
    perfectGames: 0,
  },
  games: [],
  recentAchievements: [],
  rarestAchievements: [],
  rarityDistribution: [],
  error: null,
} as const;

const sessionService: SessionService.Interface = {
  create: () => Effect.succeed(Redacted.make("test-token")),
  verify: (token) =>
    Redacted.value(token) === "test-token"
      ? Effect.succeed(Option.some({ steamId: STEAM_ID }))
      : Effect.succeed(Option.none()),
};

const dashboardService: DashboardService.Interface = {
  getDashboard: () => Effect.succeed(emptyDashboardData),
  getLibrary: () =>
    // Mirrors the production shape when no profile row exists yet: the
    // optional key is omitted entirely, never set to `undefined`.
    Effect.succeed({ games: [], earnedEntries: [], error: null }),
  getAchievementsOverview: () =>
    Effect.succeed({ ...emptyDashboardData, rarestPerGame: [] }),
  getGameAchievements: (_steamId, appId) =>
    Effect.succeed({
      gameName: "",
      gameImage: "",
      appId,
      hours: 0,
      totalAchievements: 0,
      earnedAchievements: 0,
      completion: 0,
      achievements: [],
      error: null,
    }),
  getFriends: () => Effect.succeed({ friends: [], error: null, hiddenCount: 0 }),
  getFriendComparison: () =>
    Effect.succeed({ yourData: emptyDashboardData, friendData: emptyDashboardData }),
};

const preferencesService: PreferencesService.Interface = {
  get: () => Effect.succeed({ defaultFilter: "all" }),
  save: (_steamId, input) =>
    Effect.succeed({ defaultFilter: input.defaultFilter ?? "all" }),
};

const trackedGamesService: TrackedGamesService.Interface = {
  track: () => Effect.void,
  untrack: () => Effect.void,
};

describe("Rarify HTTP API", () => {
  let handler: (request: Request, context: Context.Context<never>) => Promise<Response>;
  let dispose: () => Promise<void>;
  let context: Context.Context<never>;

  beforeAll(() => {
    const built = HttpRouter.toWebHandler(
      handlersLayer({
        session: sessionService,
        dashboard: dashboardService,
        preferences: preferencesService,
        trackedGames: trackedGamesService,
      }),
      { disableLogger: true },
    );
    handler = built.handler;
    dispose = built.dispose;
    context = Context.empty();
  });

  afterAll(async () => {
    await dispose();
  });

  it("reports an anonymous session without a cookie", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/session"),
      context,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: false });
  });

  it("reports an authenticated session with a valid signed cookie", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/session", {
        headers: { cookie: "rarify_session=test-token" },
      }),
      context,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ authenticated: true });
  });

  it("rejects dashboard reads without a session", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/dashboard"),
      context,
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      message: "Sign in through Steam to continue",
    });
  });

  it("encodes a library response without an optional profile key", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/games", {
        headers: { cookie: "rarify_session=test-token" },
      }),
      context,
    );
    expect(response.status).toBe(200);
    // SAFETY: /api/games serializes the LibraryResponse contract, whose games
    // field is an array; the test only inspects that shape.
    const body = (await response.json()) as { readonly games: ReadonlyArray<unknown> };
    expect(body.games).toEqual([]);
    expect(Object.hasOwn(body, "user")).toBe(false);
  });

  it("serves dashboard reads with a session", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/dashboard?filter=tracked", {
        headers: { cookie: "rarify_session=test-token" },
      }),
      context,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ games: [], error: null });
  });

  it("validates the dashboard filter query", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/dashboard?filter=invalid", {
        headers: { cookie: "rarify_session=test-token" },
      }),
      context,
    );
    expect(response.status).toBe(400);
  });

  it("saves normalized preferences", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/settings", {
        method: "PUT",
        headers: {
          cookie: "rarify_session=test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ defaultFilter: "owned" }),
      }),
      context,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ defaultFilter: "owned" });
  });

  it("tracks a game through the typed contract", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/tracked-games", {
        method: "POST",
        headers: {
          cookie: "rarify_session=test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ appId: 1245620 }),
      }),
      context,
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tracked: true, appId: 1245620 });
  });

  it("rejects a malformed tracking payload", async () => {
    const response = await handler(
      new Request("http://rarify.test/api/tracked-games", {
        method: "POST",
        headers: {
          cookie: "rarify_session=test-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ appId: -1 }),
      }),
      context,
    );
    expect(response.status).toBe(400);
  });
});
