import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as HttpRouter from "effect/http/HttpRouter";
import { layerForD1 } from "./adapters/d1-store.ts";
import { layerWithoutDependencies as dashboardServiceLayer } from "./adapters/dashboard-service.ts";
import { layerWithoutDependencies as preferencesServiceLayer } from "./adapters/preferences-service.ts";
import { layer as sessionTokenLayer } from "./adapters/session-jwt.ts";
import { layerWithoutDependencies as snapshotJobLayer } from "./adapters/snapshot-job.ts";
import { layer as steamOpenIdLayer } from "./adapters/steam-openid.ts";
import { layer as steamWebApiLayer } from "./adapters/steam-web-api.ts";
import { layerWithoutDependencies as steamLoginLayer } from "./services/steam-login.ts";
import { layerWithoutDependencies as trackedGamesServiceLayer } from "./adapters/tracked-games-service.ts";
import { authRoutesLayer } from "./api/auth-routes.ts";
import { handlersLayer } from "./api/handlers.ts";
import { Database } from "./database.ts";
import { apiRoutePatterns } from "./deployment-routes.ts";
import * as DashboardService from "./services/dashboard.ts";
import * as PreferencesService from "./services/preferences.ts";
import * as SessionService from "./services/session.ts";
import * as SnapshotJob from "./services/snapshot-job.ts";
import * as SteamClient from "./services/steam-client.ts";
import * as SteamLogin from "./services/steam-login.ts";
import * as SteamOpenId from "./services/steam-openid.ts";
import * as TrackedGamesService from "./services/tracked-games.ts";

/**
 * Effect-native API Worker for Steam authentication, dashboard APIs, and the
 * nightly snapshot schedule.
 *
 * @returns The configured Cloudflare Worker resource.
 */
export default Cloudflare.Worker(
  "Api",
  {
    main: import.meta.url,
    routes: Config.option(Config.String("PUBLIC_APP_DOMAIN")).pipe(
      Config.map(
        Option.match({
          onNone: () => [],
          onSome: (domain) => apiRoutePatterns(domain),
        }),
      ),
    ),
    dev: {
      port: 8787,
    },
  },
  Effect.gen(function* () {
    // Deployment secrets are resolved in the Construction phase so Alchemy
    // binds them without exposing their values to diagnostics.
    const domain = yield* Config.option(Config.String("PUBLIC_APP_DOMAIN"));

    // A deployed stack always serves the configured hostname, so the Steam
    // return_to/realm cannot drift from the host the browser is on. Local
    // development falls back to the explicit PUBLIC_APP_URL.
    const publicAppUrl = yield* Option.match(domain, {
      onNone: () => Config.String("PUBLIC_APP_URL"),
      onSome: (host) => Config.succeed(`https://${host}`),
    });

    // Local development serves over http://, so its session cookie cannot be
    // marked Secure; every https deployment keeps the stricter flag.
    const secureCookies = publicAppUrl.startsWith("https://");

    const database = yield* Cloudflare.D1.QueryDatabase(Database);
    const storeLayer = layerForD1(database);

    // Steam Web API and the persistence capability are stable for the
    // lifetime of the isolate; build them once during init.
    const steamClient = yield* SteamClient.Service.pipe(
      Effect.provide(steamWebApiLayer),
    );

    const dashboard = yield* DashboardService.Service.pipe(
      Effect.provide(
        dashboardServiceLayer.pipe(Layer.provide(Layer.mergeAll(steamWebApiLayer, storeLayer))),
      ),
    );

    const preferences = yield* PreferencesService.Service.pipe(
      Effect.provide(preferencesServiceLayer.pipe(Layer.provide(storeLayer))),
    );

    const trackedGames = yield* TrackedGamesService.Service.pipe(
      Effect.provide(trackedGamesServiceLayer.pipe(Layer.provide(storeLayer))),
    );

    const session = yield* SessionService.Service.pipe(
      Effect.provide(sessionTokenLayer),
    );

    const steamOpenId = yield* SteamOpenId.Service.pipe(
      Effect.provide(steamOpenIdLayer),
    );

    const steamLogin = yield* SteamLogin.Service.pipe(
      Effect.provide(
        steamLoginLayer.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(SteamOpenId.Service, steamOpenId),
              Layer.succeed(SessionService.Service, session),
              Layer.succeed(SteamClient.Service, steamClient),
              storeLayer,
            ),
          ),
        ),
      ),
    );

    const snapshotJob = yield* SnapshotJob.Service.pipe(
      Effect.provide(
        snapshotJobLayer.pipe(
          Layer.provide(
            Layer.mergeAll(
              Layer.succeed(DashboardService.Service, dashboard),
              storeLayer,
            ),
          ),
        ),
      ),
    );

    // Cloudflare fires this schedule daily at midnight UTC. Each player is
    // processed independently so one failure cannot stop the batch.
    yield* Cloudflare.Workers.cron("0 0 * * *", (controller) =>
      snapshotJob.runDaily(controller.scheduledTime).pipe(
        Effect.tap((result) =>
          Effect.logInfo("Daily snapshot run finished").pipe(
            Effect.annotateLogs({
              attempted: result.attempted,
              recorded: result.recorded,
              failed: result.failed,
            }),
          ),
        ),
        Effect.catchTag("PersistenceError", (error) =>
          Effect.logError("Daily snapshot run could not list users").pipe(
            Effect.annotateLogs({ operation: error.operation }),
          ),
        ),
      ),
    );

    const api = handlersLayer({ session, dashboard, preferences, trackedGames });
    const auth = authRoutesLayer({ steamLogin, publicAppUrl, secureCookies });

    return {
      fetch: yield* HttpRouter.toHttpEffect(Layer.mergeAll(api, auth)),
    };
  }).pipe(
    Effect.provide([
      Cloudflare.D1.QueryDatabaseBinding,
      Cloudflare.Workers.CronEventSourceLive,
    ]),
  ),
);
