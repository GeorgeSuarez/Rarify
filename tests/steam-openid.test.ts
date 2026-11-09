import { describe, expect, it } from "vitest";
import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Predicate from "effect/Predicate";
import * as Schema from "effect/Schema";
import { SteamIdSchema } from "@/lib/types";
import { layer as steamOpenIdLayer } from "@/src/adapters/steam-openid";
import * as SteamOpenId from "@/src/services/steam-openid";

const STEAM_ID = "76561198000000001";

const CLAIMED_ID = `https://steamcommunity.com/openid/id/${STEAM_ID}`;

/** Public origin the adapter is configured for. */
const PUBLIC_APP_URL = "https://rarify.test";

const RETURN_TO = `${PUBLIC_APP_URL}/auth/steam/callback`;

const assertion = {
  "openid.claimed_id": CLAIMED_ID,
  "openid.identity": CLAIMED_ID,
  "openid.mode": "id_res",
  "openid.op_endpoint": "https://steamcommunity.com/openid/login",
  "openid.return_to": RETURN_TO,
  "openid.sig": "signature",
  "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
  "openid.response_nonce": "2026-01-01T00:00:00Znonce",
  "openid.assoc_handle": "handle",
};

/** Build the Steam OpenID service with a scripted HTTP transport. */
const runWithFetch = <A, E>(
  effect: Effect.Effect<A, E, SteamOpenId.Service>,
  fetchImpl: typeof globalThis.fetch,
) =>
  effect.pipe(
    Effect.provide(steamOpenIdLayer(PUBLIC_APP_URL)),
    Effect.provideService(FetchHttpClient.Fetch, fetchImpl),
  );

/** Verify one assertion against a transport that always accepts it. */
const verifyWith = (
  overrides: Readonly<Record<string, string>>,
  fetchImpl: typeof globalThis.fetch = async () =>
    new Response("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n", { status: 200 }),
) =>
  Effect.runPromise(
    runWithFetch(
      Effect.gen(function* () {
        const service = yield* SteamOpenId.Service;

        return yield* service.verify({ ...assertion, ...overrides });
      }),
      fetchImpl,
    ).pipe(Effect.result),
  );

describe("SteamOpenId adapter", () => {
  it("verifies a valid assertion and returns the claimed Steam ID", async () => {
    const calls: Array<{ readonly url: string; readonly body: string }> = [];

    const fetchImpl: typeof globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), body: String(init?.body ?? "") });

      return new Response("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n", {
        status: 200,
      });
    };

    const result = await Effect.runPromise(
      runWithFetch(
        Effect.gen(function* () {
          const service = yield* SteamOpenId.Service;

          return yield* service.verify(assertion);
        }),
        fetchImpl,
      ),
    );

    expect(result).toBe(Schema.decodeUnknownSync(SteamIdSchema)(STEAM_ID));
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe("https://steamcommunity.com/openid/login");
    expect(calls[0]?.body).toContain("openid.mode=check_authentication");
    expect(calls[0]?.body).toContain("openid.sig=signature");
  });

  it("rejects an assertion Steam marks invalid", async () => {
    const result = await verifyWith(
      {},
      async () => new Response("is_valid:false", { status: 200 }),
    );

    expect(result._tag).toBe("Failure");

    if (Predicate.isTagged("Failure")(result)) {
      expect(result.failure._tag).toBe("SteamOpenIdError");
      expect(result.failure.operation).toBe("verifyAssertion");
    }
  });

  it("does not accept a body that merely contains is_valid:true", async () => {
    // A whole-line comparison keeps an unexpected extra field from satisfying
    // the check the way a substring search would.
    const result = await verifyWith(
      {},
      async () => new Response("is_valid:false,is_valid:true\n", { status: 200 }),
    );

    expect(result._tag).toBe("Failure");
  });

  it("rejects an assertion issued for a different return address", async () => {
    const result = await verifyWith({ "openid.return_to": "https://attacker.test/callback" });

    expect(result._tag).toBe("Failure");

    if (Predicate.isTagged("Failure")(result)) {
      expect(result.failure.operation).toBe("checkAssertionReturnTo");
    }
  });

  it("rejects an assertion from an unexpected OpenID provider", async () => {
    const result = await verifyWith({ "openid.op_endpoint": "https://attacker.test/openid" });

    expect(result._tag).toBe("Failure");

    if (Predicate.isTagged("Failure")(result)) {
      expect(result.failure.operation).toBe("checkAssertionEndpoint");
    }
  });

  it("rejects a non-positive OpenID mode", async () => {
    const result = await verifyWith({ "openid.mode": "cancel" });

    expect(result._tag).toBe("Failure");

    if (Predicate.isTagged("Failure")(result)) {
      expect(result.failure.operation).toBe("checkAssertionMode");
    }
  });

  it("rejects a callback without a Steam claimed ID", async () => {
    const result = await verifyWith({ "openid.claimed_id": "" });

    expect(result._tag).toBe("Failure");

    if (Predicate.isTagged("Failure")(result)) {
      expect(result.failure.operation).toBe("extractSteamId");
    }
  });

  it("reports a transport failure as a typed error", async () => {
    const fetchImpl: typeof globalThis.fetch = async () => {
      throw new Error("network down");
    };

    const result = await verifyWith({}, fetchImpl);

    expect(result._tag).toBe("Failure");

    if (Predicate.isTagged("Failure")(result)) {
      expect(result.failure._tag).toBe("SteamOpenIdError");
    }
  });

  it("provides the service through the documented Layer shape", () => {
    const layerUsable: Layer.Layer<SteamOpenId.Service> = steamOpenIdLayer(PUBLIC_APP_URL);
    expect(Option.isSome(Option.some(layerUsable))).toBe(true);
  });
});
