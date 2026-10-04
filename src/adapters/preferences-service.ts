import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as RarifyStore from "../services/rarify-store.ts";
import * as Preferences from "../services/preferences.ts";

/** Build the preference operation over the Rarify persistence capability. */
export const make: Effect.Effect<
  Preferences.Interface,
  never,
  RarifyStore.Service
> = Effect.gen(function* () {
  const store = yield* RarifyStore.Service;

  const get = Effect.fn("PreferencesService.get")(function* (steamId) {
    return yield* store.getPreferences(steamId);
  });

  const save = Effect.fn("PreferencesService.save")(function* (steamId, input) {
    const current = yield* store.getPreferences(steamId);
    const next = input.defaultFilter ?? current.defaultFilter;

    if (input.defaultFilter === undefined || next === current.defaultFilter) {
      return { defaultFilter: next };
    }

    return yield* store.savePreferences(steamId, { defaultFilter: next });
  });

  return Preferences.Service.of({ get, save });
});

/** Layer for the preference application service. */
export const layerWithoutDependencies = Layer.effect(Preferences.Service, make);
