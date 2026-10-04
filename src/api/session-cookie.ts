import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Redacted from "effect/Redacted";
import type * as Cookies from "effect/http/Cookies";
import * as HttpServerRequest from "effect/http/HttpServerRequest";
import * as HttpServerResponse from "effect/http/HttpServerResponse";
import type { Session } from "../services/session.ts";
import type * as SessionService from "../services/session.ts";
import { UnauthorizedError } from "./contracts.ts";

/** Name of the HTTP-only cookie carrying the signed Rarify session token. */
export const SESSION_COOKIE = "rarify_session";

const SESSION_MAX_AGE = Duration.days(30);

const cookieOptions = (
  secure: boolean,
): Omit<NonNullable<Cookies.Cookie["options"]>, "maxAge"> & {
  readonly maxAge: Duration.Duration;
} => ({
  httpOnly: true,
  secure,
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_MAX_AGE,
});

/** Session readers bound to one verified session-token capability. */
export interface SessionReader {
  /** Read and verify the current request's session cookie, if present. */
  readonly read: Effect.Effect<Option.Option<Session>, never, HttpServerRequest.HttpServerRequest>;

  /** Require a verified session or fail with the API's unauthorized error. */
  readonly require: Effect.Effect<Session, UnauthorizedError, HttpServerRequest.HttpServerRequest>;
}

/**
 * Bind session-cookie reading to an already-resolved session-token service.
 *
 * The Worker resolves its token capability during init, so the request handler
 * only needs the incoming request from the Effect context.
 *
 * @param session - Signed session-token capability resolved during init.
 * @returns Cookie readers that fail with `UnauthorizedError` when required.
 */
export const createSessionReader = (session: SessionService.Interface): SessionReader => {
  const read: SessionReader["read"] = Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest;
    const token = request.cookies[SESSION_COOKIE];

    if (token === undefined || token.length === 0) return Option.none();

    return yield* session
      .verify(Redacted.make(token, { label: "Rarify session cookie" }))
      .pipe(
        Effect.catchTag("SessionError", (error) =>
          Effect.logWarning("Session token verification failed").pipe(
            Effect.annotateLogs({ operation: error.operation }),
            Effect.as(Option.none<Session>()),
          ),
        ),
      );
  });

  const require: SessionReader["require"] = read.pipe(
    Effect.flatMap((current) =>
      Option.match(current, {
        onNone: () =>
          Effect.fail(new UnauthorizedError({ message: "Sign in through Steam to continue" })),
        onSome: (value) => Effect.succeed(value),
      }),
    ),
  );

  return { read, require };
};

/** Attach the signed session cookie to a response. */
export const withSessionCookie = (
  response: HttpServerResponse.HttpServerResponse,
  token: Redacted.Redacted<string>,
  secure: boolean,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never> =>
  HttpServerResponse.setCookie(
    response,
    SESSION_COOKIE,
    Redacted.value(token),
    cookieOptions(secure),
  ).pipe(Effect.orDie);

/** Expire the session cookie so the browser drops the signed token. */
export const clearSessionCookie = (
  response: HttpServerResponse.HttpServerResponse,
  secure: boolean,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never> =>
  HttpServerResponse.expireCookie(response, SESSION_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
  }).pipe(Effect.orDie);
