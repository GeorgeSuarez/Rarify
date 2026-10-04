import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SteamId } from "../../lib/types.ts";
import { computeStats } from "../domain/dashboard-calculations.ts";
import * as Dashboard from "../services/dashboard.ts";
import * as RarifyStore from "../services/rarify-store.ts";
import * as SnapshotJob from "../services/snapshot-job.ts";

/** Build the daily snapshot job over dashboard and persistence capabilities. */
export const make: Effect.Effect<
  SnapshotJob.Interface,
  never,
  Dashboard.Service | RarifyStore.Service
> = Effect.gen(function* () {
  const dashboard = yield* Dashboard.Service;
  const store = yield* RarifyStore.Service;

  const runDaily = Effect.fn("SnapshotJob.runDaily")(function* (scheduledAtMs) {
    const steamIds = yield* store.listUserSteamIds();
    const date = new Date(scheduledAtMs).toISOString().slice(0, 10);

    const outcomes = yield* Effect.forEach(
      steamIds,
      (steamId: SteamId) =>
        Effect.gen(function* () {
          const library = yield* dashboard.getLibrary(steamId);

          if (library.error !== null) {
            return yield* Effect.logWarning(
              "Skipping snapshot for a private or unavailable profile",
            ).pipe(
              Effect.annotateLogs({ errorType: library.error.type }),
              Effect.as(false),
            );
          }

          const nowMs = yield* Clock.currentTimeMillis;
          yield* store.recordDailySnapshot(
            steamId,
            date,
            computeStats(library.games, nowMs),
          );

          return true;
        }).pipe(
          Effect.catchTag("PersistenceError", (error) =>
            Effect.logError("Daily snapshot persistence failed for one player").pipe(
              Effect.annotateLogs({ operation: error.operation }),
              Effect.as(false),
            ),
          ),
          Effect.catchTag("SteamApiError", (error) =>
            Effect.logError("Daily snapshot Steam read failed for one player").pipe(
              Effect.annotateLogs({ operation: error.operation }),
              Effect.as(false),
            ),
          ),
        ),
      { concurrency: 2 },
    );

    const recorded = outcomes.filter((recorded) => recorded).length;

    return {
      attempted: outcomes.length,
      recorded,
      failed: outcomes.length - recorded,
    } satisfies SnapshotJob.SnapshotRunResult;
  });

  return SnapshotJob.Service.of({ runDaily });
});

/** Layer for the daily snapshot job; Cloudflare scheduling remains an adapter concern. */
export const layerWithoutDependencies = Layer.effect(SnapshotJob.Service, make);
