import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as RarifyStore from "../services/rarify-store.ts";
import * as TrackedGames from "../services/tracked-games.ts";

/** Build the tracked-game operation over the Rarify persistence capability. */
export const make: Effect.Effect<
  TrackedGames.Interface,
  never,
  RarifyStore.Service
> = Effect.gen(function* () {
  const store = yield* RarifyStore.Service;

  const track = Effect.fn("TrackedGamesService.track")(function* (steamId, appId) {
    yield* store.trackGame(steamId, appId);
  });

  const untrack = Effect.fn("TrackedGamesService.untrack")(function* (
    steamId,
    appId,
  ) {
    yield* store.untrackGame(steamId, appId);
  });

  return TrackedGames.Service.of({ track, untrack });
});

/** Layer for the tracked-game application service. */
export const layerWithoutDependencies = Layer.effect(TrackedGames.Service, make);
