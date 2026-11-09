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

/** Path Steam redirects back to; must match the `openid.return_to` we send. */
const CALLBACK_PATH = "/auth/steam/callback";

const make = (publicAppUrl: string) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient;

    const expectedReturnTo = `${publicAppUrl}${CALLBACK_PATH}`;

    const reject = (operation: string, message: string, cause: string) =>
      new SteamOpenId.SteamOpenIdError({ operation, message, cause: new Error(cause) });

    /**
     * Reject assertions that were not issued for this relying party.
     *
     * Steam's `check_authentication` only proves the assertion is signed; it
     * does not prove it was issued for Rarify. Without these checks a valid
     * assertion obtained for any other Steam OpenID relying party would be
     * accepted here, so the callback URL would act as a long-lived bearer
     * credential.
     */
    const assertIssuedForRarify = (assertion: SteamOpenId.SteamOpenIdAssertion) => {
      if (assertion["openid.mode"] !== "id_res") {
        return Effect.fail(
          reject(
            "checkAssertionMode",
            "Steam OpenID response was not a positive assertion",
            "Missing or unexpected openid.mode",
          ),
        );
      }

      if (assertion["openid.op_endpoint"] !== STEAM_OPENID_URL) {
        return Effect.fail(
          reject(
            "checkAssertionEndpoint",
            "Steam OpenID response came from an unexpected provider",
            "Missing or unexpected openid.op_endpoint",
          ),
        );
      }

      if (assertion["openid.return_to"] !== expectedReturnTo) {
        return Effect.fail(
          reject(
            "checkAssertionReturnTo",
            "Steam OpenID response was issued for a different return address",
            "openid.return_to did not match this deployment's callback URL",
          ),
        );
      }

      return Effect.void;
    };

    const verify = Effect.fn("SteamOpenId.verify")(function* (assertion) {
      yield* assertIssuedForRarify(assertion);

      const claimedId = assertion["openid.claimed_id"];

      if (!claimedId?.startsWith(STEAM_ID_PREFIX)) {
        return yield* Effect.fail(
          reject(
            "extractSteamId",
            "Steam OpenID response did not include a valid claimed account ID",
            "Missing or malformed openid.claimed_id",
          ),
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

      // Steam answers with `key:value` lines. Compare whole lines rather than
      // searching the body, so an unexpected extra field cannot satisfy it.
      const isValid = verificationText.split("\n").some((line) => line.trim() === "is_valid:true");

      if (response.status !== 200 || !isValid) {
        return yield* Effect.fail(
          reject(
            "verifyAssertion",
            "Steam rejected the OpenID assertion",
            `Steam OpenID returned HTTP ${response.status}`,
          ),
        );
      }

      return yield* Schema.decodeUnknownEffect(SteamIdSchema)(
        claimedId.slice(STEAM_ID_PREFIX.length),
      ).pipe(
        Effect.mapError(() =>
          reject(
            "parseSteamId",
            "Steam OpenID claimed account ID was not valid",
            "openid.claimed_id did not contain a Steam account ID",
          ),
        ),
      );
    });

    return SteamOpenId.Service.of({ verify });
  });

/**
 * Production Steam OpenID adapter using Effect's Fetch-backed HttpClient.
 *
 * @param publicAppUrl - Public origin this deployment serves. Assertions whose
 * `openid.return_to` points anywhere else are rejected.
 */
export const layer = (publicAppUrl: string) =>
  Layer.effect(SteamOpenId.Service, make(publicAppUrl)).pipe(Layer.provide(FetchHttpClient.layer));
