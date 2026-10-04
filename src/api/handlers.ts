import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Etag from "effect/http/Etag";
import * as HttpPlatform from "effect/http/HttpPlatform";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";
import type { PersistenceError } from "../services/rarify-store.ts";
import type { SessionError } from "../services/session.ts";
import type { SteamApiError } from "../services/steam-client.ts";
import * as DashboardService from "../services/dashboard.ts";
import * as PreferencesService from "../services/preferences.ts";
import * as SessionService from "../services/session.ts";
import * as TrackedGamesService from "../services/tracked-games.ts";
import { ApiFailure, RarifyApi, UnauthorizedError } from "./contracts.ts";
import { createSessionReader } from "./session-cookie.ts";

/**
 * Worker-safe HTTP platform services. Workers have no filesystem, so file
 * responses are defects, while Web stream compression remains available.
 */
const WebPlatform = Layer.succeed(HttpPlatform.HttpPlatform, {
  platform: "web",
  compression: HttpPlatform.makeCompressionWeb({
    algorithms: ["gzip", "deflate"],
    transform: (algorithm) => HttpPlatform.compressionTransformWeb(algorithm),
  }),
  fileResponse: () =>
    Effect.die("HttpPlatform.fileResponse is not supported on Workers"),
  fileWebResponse: () =>
    Effect.die("HttpPlatform.fileWebResponse is not supported on Workers"),
});

interface LoggableFailure {
  readonly operation: string;
}

const failRequest = (
  operation: string,
  message: string,
  error: LoggableFailure,
): Effect.Effect<never, ApiFailure> =>
  Effect.logError(message).pipe(
    Effect.annotateLogs({ failedOperation: error.operation, operation }),
    Effect.andThen(Effect.fail(new ApiFailure({ message }))),
  );

/**
 * Translate application and integration failures into the API's public error.
 *
 * @param effect - Handler effect whose failures can reach the API boundary.
 * @param operation - Endpoint operation name used in diagnostics.
 * @returns The same success value with `ApiFailure` in the error channel.
 */
const toApiFailure = <A, R>(
  effect: Effect.Effect<
    A,
    PersistenceError | SteamApiError | SessionError | UnauthorizedError,
    R
  >,
  operation: string,
): Effect.Effect<A, ApiFailure | UnauthorizedError, R> =>
  effect.pipe(
    Effect.catchTag("PersistenceError", (error) =>
      failRequest(operation, "The request could not be completed", error),
    ),
    Effect.catchTag("SteamApiError", (error) =>
      failRequest(operation, "Steam data could not be loaded", error),
    ),
    Effect.catchTag("SessionError", (error) =>
      failRequest(operation, "The session could not be processed", error),
    ),
  );

/**
 * Build the request handlers for every Rarify API group from already-resolved
 * application services.
 *
 * @param services - Application capabilities resolved during Worker init.
 * @returns A layer that provides the API's group handler services.
 */
export const handlersLayer = (services: {
  readonly session: SessionService.Interface;
  readonly dashboard: DashboardService.Interface;
  readonly preferences: PreferencesService.Interface;
  readonly trackedGames: TrackedGamesService.Interface;
}) => {
  const { require: requireSession } = createSessionReader(services.session);

  const groups = Layer.mergeAll(
    HttpApiBuilder.group(RarifyApi, "Session", (handlers) =>
      handlers.handle("getSessionStatus", () =>
        requireSession.pipe(
          Effect.map(() => ({ authenticated: true })),
          Effect.catchTag("UnauthorizedError", () =>
            Effect.succeed({ authenticated: false }),
          ),
        ),
      ),
    ),

    HttpApiBuilder.group(RarifyApi, "Dashboard", (handlers) =>
      handlers.handle("getDashboard", ({ query }) =>
        toApiFailure(
          requireSession.pipe(
            Effect.flatMap((session) =>
              services.dashboard.getDashboard(session.steamId, query.filter ?? "all"),
            ),
          ),
          "getDashboard",
        ),
      ),
    ),

    HttpApiBuilder.group(RarifyApi, "Library", (handlers) =>
      handlers
        .handle("getGames", () =>
          toApiFailure(
            requireSession.pipe(
              Effect.flatMap((session) => services.dashboard.getLibrary(session.steamId)),
            ),
            "getGames",
          ),
        )
        .handle("getGameAchievements", ({ params }) =>
          toApiFailure(
            requireSession.pipe(
              Effect.flatMap((session) =>
                services.dashboard.getGameAchievements(session.steamId, params.appId),
              ),
            ),
            "getGameAchievements",
          ),
        ),
    ),

    HttpApiBuilder.group(RarifyApi, "Achievements", (handlers) =>
      handlers.handle("getAchievementsOverview", () =>
        toApiFailure(
          requireSession.pipe(
            Effect.flatMap((session) =>
              services.dashboard.getAchievementsOverview(session.steamId),
            ),
          ),
          "getAchievementsOverview",
        ),
      ),
    ),

    HttpApiBuilder.group(RarifyApi, "Friends", (handlers) =>
      handlers
        .handle("getFriends", () =>
          toApiFailure(
            requireSession.pipe(
              Effect.flatMap((session) => services.dashboard.getFriends(session.steamId)),
            ),
            "getFriends",
          ),
        )
        .handle("getFriendComparison", ({ params }) =>
          toApiFailure(
            requireSession.pipe(
              Effect.flatMap((session) =>
                services.dashboard.getFriendComparison(session.steamId, params.steamId),
              ),
            ),
            "getFriendComparison",
          ),
        ),
    ),

    HttpApiBuilder.group(RarifyApi, "Preferences", (handlers) =>
      handlers
        .handle("getPreferences", () =>
          toApiFailure(
            requireSession.pipe(
              Effect.flatMap((session) => services.preferences.get(session.steamId)),
            ),
            "getPreferences",
          ),
        )
        .handle("savePreferences", ({ payload }) =>
          toApiFailure(
            requireSession.pipe(
              Effect.flatMap((session) =>
                services.preferences.save(
                  session.steamId,
                  payload.defaultFilter === undefined
                    ? {}
                    : { defaultFilter: payload.defaultFilter },
                ),
              ),
            ),
            "savePreferences",
          ),
        ),
    ),

    HttpApiBuilder.group(RarifyApi, "TrackedGames", (handlers) =>
      handlers
        .handle("trackGame", ({ payload }) =>
          toApiFailure(
            requireSession.pipe(
              Effect.flatMap((session) =>
                services.trackedGames.track(session.steamId, payload.appId),
              ),
              Effect.as({ tracked: true, appId: payload.appId }),
            ),
            "trackGame",
          ),
        )
        .handle("untrackGame", ({ query }) =>
          toApiFailure(
            requireSession.pipe(
              Effect.flatMap((session) =>
                services.trackedGames.untrack(session.steamId, query.appId),
              ),
              Effect.as({ tracked: false, appId: query.appId }),
            ),
            "untrackGame",
          ),
        ),
    ),
  );

  return HttpApiBuilder.layer(RarifyApi).pipe(
    Layer.provide(groups),
    Layer.provide([
      Etag.layer,
      WebPlatform,
      Path.layer,
      FileSystem.layerNoop({}),
    ]),
  );
};
