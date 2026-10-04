import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import * as Schema from "effect/Schema";
import type { SteamId } from "../../lib/types.ts";

/** Session identity verified from a signed HTTP-only cookie. */
export interface Session {
  readonly steamId: SteamId;
}

/** Typed failure while creating or verifying a signed session token. */
export class SessionError extends Schema.TaggedError<SessionError>()("SessionError", {
  operation: Schema.String,
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

/** Signed cookie-token operations independent of HTTP cookie mechanics. */
export interface Interface {
  /** Create a 30-day signed token for one Steam account. */
  readonly create: (steamId: SteamId) => Effect.Effect<Redacted.Redacted<string>, SessionError>;

  /**
   * Verify a cookie token; invalid, expired, or malformed tokens are ordinary
   * absence, while unexpected signing-runtime failures remain typed errors.
   */
  readonly verify: (
    token: Redacted.Redacted<string>,
  ) => Effect.Effect<Option.Option<Session>, SessionError>;
}

/**
 * Effect service for signed session tokens; the HTTP adapter owns cookie flags
 * and response headers.
 */
export class Service extends Context.Service<Service, Interface>()("@rarify/SessionService") {}
