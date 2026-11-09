import type * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type * as HttpServerRequest from "effect/http/HttpServerRequest";

/**
 * Count one request against a named bucket.
 *
 * Never fails: a backend error is treated as "allowed" so a rate-limit outage
 * cannot take down sign-in or the dashboard. Callers therefore only need to
 * branch on the boolean.
 *
 * @param key - Bucket identifier; each distinct key is counted separately.
 * @returns `true` when the request is within the bucket's allowance.
 */
export type Consume<R = never> = (key: string) => Effect.Effect<boolean, never, R>;

/** Bucket key used when no client address is available. */
export const UNKNOWN_CLIENT_KEY = "unknown-client";

/**
 * Derive a rate-limit bucket key from the caller's network address.
 *
 * Cloudflare populates `CF-Connecting-IP` at the edge before the Worker runs,
 * and `remoteAddress` covers local runs and tests. Both are checked because
 * header casing is not guaranteed across runtimes.
 *
 * @param request - Incoming request whose address should be keyed.
 * @returns The client address, or {@link UNKNOWN_CLIENT_KEY} when absent.
 */
export const clientKeyOf = (request: HttpServerRequest.HttpServerRequest): string =>
  request.headers["cf-connecting-ip"] ??
  request.headers["CF-Connecting-IP"] ??
  Option.getOrElse(request.remoteAddress, () => UNKNOWN_CLIENT_KEY);
