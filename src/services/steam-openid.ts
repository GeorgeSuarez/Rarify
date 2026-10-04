import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { SteamId } from "../../lib/types.ts";

/** Typed failure from Steam's OpenID assertion verification endpoint. */
export class SteamOpenIdError extends Schema.TaggedError<SteamOpenIdError>()("SteamOpenIdError", {
  operation: Schema.String,
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

/** Steam OpenID callback parameters parsed from the incoming request URL. */
export type SteamOpenIdAssertion = Readonly<Record<string, string>>;

/** Steam OpenID verification capability used by the login application service. */
export interface Interface {
  /** Verify the assertion with Steam and return its validated Steam account ID. */
  readonly verify: (assertion: SteamOpenIdAssertion) => Effect.Effect<SteamId, SteamOpenIdError>;
}

/**
 * Effect service for verifying Steam OpenID callbacks without coupling callers
 * to the provider's HTTP protocol.
 */
export class Service extends Context.Service<Service, Interface>()("@rarify/SteamOpenId") {}
