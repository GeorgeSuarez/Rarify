import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpClient from "effect/http/HttpClient";
import * as HttpClientRequest from "effect/http/HttpClientRequest";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import { SteamIdSchema } from "../../lib/types.ts";
import * as SteamOpenId from "../services/steam-openid.ts";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

const STEAM_ID_PREFIX = "https://steamcommunity.com/openid/id/";

const make = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient;

  const verify = Effect.fn("SteamOpenId.verify")(function* (assertion) {
    const claimedId = assertion["openid.claimed_id"];

    if (!claimedId?.startsWith(STEAM_ID_PREFIX)) {
      return yield* Effect.fail(
        new SteamOpenId.SteamOpenIdError({
          operation: "extractSteamId",
          message: "Steam OpenID response did not include a valid claimed account ID",
          cause: new Error("Missing or malformed openid.claimed_id"),
        }),
      );
    }

    const response = yield* httpClient
      .execute(
        HttpClientRequest.post(STEAM_OPENID_URL).pipe(
          HttpClientRequest.bodyUrlParams({
            ...assertion,
            "openid.mode": "check_authentication",
          }),
        ),
      )
      .pipe(
        Effect.mapError(
          (cause) =>
            new SteamOpenId.SteamOpenIdError({
              operation: "verifyAssertion",
              message: "Steam OpenID verification request failed",
              cause,
            }),
        ),
      );

    const verificationText = yield* response.text.pipe(
      Effect.mapError(
        (cause) =>
          new SteamOpenId.SteamOpenIdError({
            operation: "readVerificationResponse",
            message: "Steam OpenID verification response could not be read",
            cause,
          }),
      ),
    );

    if (response.status !== 200 || !verificationText.includes("is_valid:true")) {
      return yield* Effect.fail(
        new SteamOpenId.SteamOpenIdError({
          operation: "verifyAssertion",
          message: "Steam rejected the OpenID assertion",
          cause: new Error(`Steam OpenID returned HTTP ${response.status}`),
        }),
      );
    }

    return yield* Schema.decodeUnknownEffect(SteamIdSchema)(
      claimedId.slice(STEAM_ID_PREFIX.length),
    ).pipe(
      Effect.mapError(
        (cause) =>
          new SteamOpenId.SteamOpenIdError({
            operation: "parseSteamId",
            message: "Steam OpenID claimed account ID was not valid",
            cause,
          }),
      ),
    );
  });

  return SteamOpenId.Service.of({ verify });
});

/**
 * Production Steam OpenID adapter using Effect's Fetch-backed HttpClient.
 */
export const layer = Layer.effect(SteamOpenId.Service, make).pipe(
  Layer.provide(FetchHttpClient.layer),
);
