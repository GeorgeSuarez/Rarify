import * as Effect from "effect/Effect";
import type * as Cloudflare from "@alchemy.run/cloudflare";
import type * as RuntimeContext from "alchemy/RuntimeContext";
import type * as RateLimit from "../services/rate-limit.ts";

/**
 * Adapt a Cloudflare Rate Limit binding into the application's {@link RateLimit.Consume}.
 *
 * Fails open: if the binding itself errors, the failure is logged and the
 * request proceeds. Rate limiting is defence in depth here — the callback still
 * requires a valid Steam assertion, and every API handler still requires a
 * verified session — so an edge hiccup must not lock everyone out of sign-in.
 *
 * @param client - Rate Limit client resolved during Worker init.
 * @returns A bucket counter keyed by an arbitrary string.
 */
export const consumeFrom =
  (client: Cloudflare.Workers.RateLimitClient): RateLimit.Consume<RuntimeContext.RuntimeContext> =>
  (key: string) =>
    client.limit({ key }).pipe(
      Effect.map((result) => result.success),
      Effect.catchTag("RateLimitError", (error) =>
        Effect.logWarning("Rate limit check failed; allowing the request").pipe(
          Effect.annotateLogs({ operation: "rateLimit", message: error.message }),
          Effect.as(true),
        ),
      ),
    );
