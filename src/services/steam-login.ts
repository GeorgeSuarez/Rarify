import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Redacted from "effect/Redacted";
import type { SteamId } from "../../lib/types.ts";
import * as RarifyStore from "./rarify-store.ts";
import * as Session from "./session.ts";
import * as SteamClient from "./steam-client.ts";
import * as SteamOpenId from "./steam-openid.ts";

/** Errors that prevent Steam login from producing a signed session. */
export type SteamLoginError =
  | SteamOpenId.SteamOpenIdError
  | Session.SessionError;

/** Application policy for a Steam account's display profile. */
function profileFor(
  steamId: SteamId,
  summaries: ReadonlyArray<SteamClient.ProfileSummary>,
): RarifyStore.UserProfileInput {
  const summary = summaries.find((player) => player.steamId === steamId);
  return {
    personaName: summary?.personaName ?? `Player ${steamId.slice(-8)}`,
    avatar: summary?.avatarFull ?? null,
  };
}

/** Coordinates Steam assertion verification, profile refresh, and session creation. */
export interface Interface {
  /** Verify a Steam callback, refresh its display profile, and issue a session. */
  readonly completeLogin: (
    assertion: SteamOpenId.SteamOpenIdAssertion,
  ) => Effect.Effect<Redacted.Redacted<string>, SteamLoginError>;
}

/** Effect service for the Steam sign-in workflow. */
export class Service extends Context.Service<Service, Interface>()(
  "@rarify/SteamLogin",
) {}

/** Build the application-owned Steam sign-in operation from its capabilities. */
export const make: Effect.Effect<
  Interface,
  never,
  | SteamOpenId.Service
  | Session.Service
  | SteamClient.Service
  | RarifyStore.Service
> = Effect.gen(function* () {
  const openId = yield* SteamOpenId.Service;
  const session = yield* Session.Service;
  const steam = yield* SteamClient.Service;
  const store = yield* RarifyStore.Service;
  const noSummaries: ReadonlyArray<SteamClient.ProfileSummary> = [];

  const completeLogin = Effect.fn("SteamLogin.completeLogin")(function* (
    assertion: SteamOpenId.SteamOpenIdAssertion,
  ) {
    const steamId = yield* openId.verify(assertion);
    const summaries = yield* steam
      .getPlayerSummaries([steamId])
      .pipe(
        Effect.catchTag("SteamApiError", () => Effect.succeed(noSummaries)),
      );

    yield* store.saveUserProfile(steamId, profileFor(steamId, summaries)).pipe(
      Effect.tapError((error) =>
        Effect.logWarning("Steam login profile persistence failed; continuing").pipe(
          Effect.annotateLogs({ operation: error.operation, errorTag: error._tag }),
        ),
      ),
      Effect.ignore,
    );

    return yield* session.create(steamId);
  });

  return Service.of({ completeLogin });
});

/** Layer for the Steam sign-in workflow; provider choices remain at the Worker composition root. */
export const layerWithoutDependencies = Layer.effect(Service, make);
