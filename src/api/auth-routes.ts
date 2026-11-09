import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import * as SteamLogin from "../services/steam-login.ts";
import { clientKeyOf } from "../services/rate-limit.ts";
import type * as RateLimit from "../services/rate-limit.ts";
import { clearSessionCookie, withSessionCookie } from "./session-cookie.ts";

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

/** Collect the OpenID assertion parameters from a Steam callback URL. */
function assertionFrom(url: string) {
  const parameters = new URL(url, "https://rarify.invalid").searchParams;
  const assertion: Record<string, string> = {};

  for (const [name, value] of parameters) {
    assertion[name] = value;
  }

  return assertion;
}

/**
 * Mark an auth response uncacheable.
 *
 * The Steam callback URL carries the signed assertion, so caching it anywhere
 * would turn a one-time redirect into a replayable credential.
 */
const noStore = (response: HttpServerResponse.HttpServerResponse) =>
  HttpServerResponse.setHeader(response, "cache-control", "no-store");

/**
 * Build the redirect-style Steam authentication routes.
 *
 * These routes stay outside the JSON API because they redirect the browser and
 * set or clear the HTTP-only session cookie.
 *
 * @param services - Login application service and public URL configuration.
 * @returns A router layer serving `/auth/*`.
 */
export const authRoutesLayer = <R = never>(services: {
  readonly steamLogin: SteamLogin.Interface;
  readonly publicAppUrl: string;
  readonly secureCookies: boolean;
  /** Spends one unit of the caller's sign-in budget; `true` means allowed. */
  readonly consumeAuthRateLimit: RateLimit.Consume<R>;
}) =>
  HttpRouter.use((router) =>
    Effect.gen(function* () {
      yield* router.add("GET", "/auth/steam", () => {
        const parameters = new URLSearchParams({
          "openid.ns": "http://specs.openid.net/auth/2.0",
          "openid.mode": "checkid_setup",
          "openid.return_to": `${services.publicAppUrl}/auth/steam/callback`,
          "openid.realm": services.publicAppUrl,
          "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
          "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
          "openid.ns.pape": "http://specs.openid.net/extensions/pape/1.0",
          "openid.pape.max_auth_age": "0",
        });

        return Effect.succeed(
          noStore(HttpServerResponse.redirect(`${STEAM_OPENID_URL}?${parameters.toString()}`)),
        );
      });

      yield* router.add("GET", "/auth/steam/callback", (request) =>
        Effect.gen(function* () {
          // Keyed by network address: no session exists yet, and this is the
          // endpoint that spends a Steam round-trip and mints a session cookie.
          const allowed = yield* services.consumeAuthRateLimit(
            `auth-callback:${clientKeyOf(request)}`,
          );

          if (!allowed) {
            yield* Effect.logWarning("Steam sign-in attempt was rate limited");

            return noStore(
              HttpServerResponse.redirect(`${services.publicAppUrl}/login?error=rate_limited`),
            );
          }

          const outcome = yield* services.steamLogin
            .completeLogin(assertionFrom(request.url))
            .pipe(Effect.result);

          if (Result.isFailure(outcome)) {
            yield* Effect.logWarning("Steam sign-in failed").pipe(
              Effect.annotateLogs({ errorTag: outcome.failure._tag }),
            );

            return noStore(
              HttpServerResponse.redirect(`${services.publicAppUrl}/login?error=auth_failed`),
            );
          }

          return yield* withSessionCookie(
            noStore(HttpServerResponse.redirect(`${services.publicAppUrl}/`)),
            outcome.success,
            services.secureCookies,
          );
        }),
      );

      yield* router.add("POST", "/auth/logout", () =>
        Effect.gen(function* () {
          return yield* clearSessionCookie(
            noStore(HttpServerResponse.redirect(`${services.publicAppUrl}/login`)),
            services.secureCookies,
          );
        }),
      );
    }),
  );
