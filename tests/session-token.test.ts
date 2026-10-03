import { describe, expect, it } from "vitest";
import type * as ConfigError from "effect/Config";
import * as ConfigProvider from "effect/ConfigProvider";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import { SteamIdSchema } from "@/lib/types";
import { layer as sessionTokenLayer } from "@/src/adapters/session-jwt";
import * as Session from "@/src/services/session";

const STEAM_ID = Schema.decodeUnknownSync(SteamIdSchema)("76561198000000001");
const SECRET = "test-auth-secret";

const runWithSession = <A, E>(effect: Effect.Effect<A, E, Session.Service>) =>
  effect.pipe(
    Effect.provide(sessionTokenLayer),
    Effect.provide(
      ConfigProvider.layer(ConfigProvider.fromUnknown({ AUTH_SECRET: SECRET })),
    ),
  );

describe("SessionService", () => {
  it("creates a token that verifies back to the same Steam account", async () => {
    const session = await Effect.runPromise(
      runWithSession(
        Effect.gen(function* () {
          const service = yield* Session.Service;
          const token = yield* service.create(STEAM_ID);
          return yield* service.verify(token);
        }),
      ),
    );

    expect(Option.isSome(session)).toBe(true);
    expect(Option.getOrThrow(session).steamId).toBe(STEAM_ID);
  });

  it("treats a tampered token as ordinary absence", async () => {
    const session = await Effect.runPromise(
      runWithSession(
        Effect.gen(function* () {
          const service = yield* Session.Service;
          const token = yield* service.create(STEAM_ID);
          const tampered = `${Redacted.value(token).slice(0, -2)}xx`;
          return yield* service.verify(
            Redacted.make(tampered, { label: "tampered" }),
          );
        }),
      ),
    );

    expect(Option.isNone(session)).toBe(true);
  });

  it("treats a token signed with another secret as ordinary absence", async () => {
    const forged = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* Session.Service;
        return yield* service.create(STEAM_ID);
      }).pipe(
        Effect.provide(sessionTokenLayer),
        Effect.provide(
          ConfigProvider.layer(
            ConfigProvider.fromUnknown({ AUTH_SECRET: "a-different-secret" }),
          ),
        ),
      ),
    );

    const verified = await Effect.runPromise(
      runWithSession(
        Effect.gen(function* () {
          const service = yield* Session.Service;
          return yield* service.verify(forged);
        }),
      ),
    );

    expect(Option.isNone(verified)).toBe(true);
  });

  it("fails with a typed error when AUTH_SECRET is missing", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const service = yield* Session.Service;
        return yield* service.create(STEAM_ID);
      }).pipe(
        Effect.provide(sessionTokenLayer),
        Effect.provide(ConfigProvider.layer(ConfigProvider.fromUnknown({}))),
        Effect.result,
      ),
    );

    expect(result._tag).toBe("Failure");
  });

  it("shares one Layer build across both methods", async () => {
    const layer = sessionTokenLayer;
    const services = await Effect.runPromise(
      Effect.gen(function* () {
        const first = yield* Session.Service;
        const second = yield* Session.Service;
        return first === second;
      }).pipe(
        Effect.provide(layer),
        Effect.provide(
          ConfigProvider.layer(ConfigProvider.fromUnknown({ AUTH_SECRET: SECRET })),
        ),
      ),
    );

    expect(services).toBe(true);
  });
});

/** Ensures the Layer type stays usable from the Worker composition root. */
const layerUsable: Layer.Layer<Session.Service, ConfigError.ConfigError> =
  sessionTokenLayer;
void layerUsable;
