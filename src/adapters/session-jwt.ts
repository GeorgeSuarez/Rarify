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

const SessionPayloadSchema = Schema.Struct({ steamId: SteamIdSchema });

const make = Effect.gen(function* () {
  const secret = yield* Config.Redacted("AUTH_SECRET");
  const secretBytes = () => new TextEncoder().encode(Redacted.value(secret));

  const create = Effect.fn("SessionService.create")(function* (steamId) {
    const token = yield* Effect.tryPromise({
      try: () =>
        new SignJWT({ steamId })
          .setProtectedHeader({ alg: "HS256" })
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
        try: () => jwtVerify(Redacted.value(token), secretBytes()),
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
 */
export const layer = Layer.effect(Session.Service, make);
