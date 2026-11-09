import { jwtVerify, SignJWT } from "jose";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { SteamIdSchema } from "../../lib/types.ts";
import * as Session from "../services/session.ts";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/** Issuer claim stamped on every Rarify session token. */
const SESSION_ISSUER = "rarify";

/** Only the algorithm this service signs with is ever accepted. */
const SESSION_ALGORITHM = "HS256";

const SessionPayloadSchema = Schema.Struct({ steamId: SteamIdSchema });

const make = (audience: string) =>
  Effect.gen(function* () {
    const secret = yield* Config.Redacted("AUTH_SECRET");
    const secretBytes = () => new TextEncoder().encode(Redacted.value(secret));

    const create = Effect.fn("SessionService.create")(function* (steamId) {
      const token = yield* Effect.tryPromise({
        try: () =>
          new SignJWT({ steamId })
            .setProtectedHeader({ alg: SESSION_ALGORITHM })
            .setIssuer(SESSION_ISSUER)
            .setAudience(audience)
            .setIssuedAt()
            .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
            .sign(secretBytes()),
        catch: (cause) =>
          new Session.SessionError({
            operation: "create",
            message: "Rarify session token could not be created",
            cause,
          }),
      });

      return Redacted.make(token, { label: "Rarify session token" });
    });

    const verify = Effect.fn("SessionService.verify")(function* (token) {
      const result = yield* Effect.result(
        Effect.tryPromise({
          // Pin the algorithm, issuer, and audience so a token minted by a
          // different Rarify stage (or with a different algorithm) never
          // verifies here, even when both stages share one AUTH_SECRET.
          try: () =>
            jwtVerify(Redacted.value(token), secretBytes(), {
              algorithms: [SESSION_ALGORITHM],
              issuer: SESSION_ISSUER,
              audience,
            }),
          catch: (cause) =>
            new Session.SessionError({
              operation: "verify",
              message: "Rarify session token could not be verified",
              cause,
            }),
        }),
      );

      if (Result.isFailure(result)) return Option.none();
      const session = Schema.decodeUnknownOption(SessionPayloadSchema)(result.success.payload);

      return Option.map(session, ({ steamId }) => ({ steamId }));
    });

    return Session.Service.of({ create, verify });
  });

/**
 * Production session-token Layer using `AUTH_SECRET` from Alchemy config.
 *
 * @param audience - Public origin this deployment serves. Bound as the JWT
 * `aud` claim so preview and production sessions are not interchangeable.
 */
export const layer = (audience: string) => Layer.effect(Session.Service, make(audience));
