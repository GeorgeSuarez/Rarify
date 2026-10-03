import * as Effect from "effect/Effect";
import * as FetchHttpClient from "effect/http/FetchHttpClient";
import * as HttpApiClient from "effect/http-api/HttpApiClient";
import * as Layer from "effect/Layer";
import { RarifyApi } from "../api/contracts.ts";

/**
 * Browser HTTP client layer that sends the session cookie with every API call.
 *
 * The SPA and API share one origin, so credentialed requests plus `SameSite=Lax`
 * cookies are sufficient; no CORS configuration is involved.
 */
const browserHttpClient = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, {
      credentials: "include",
    }),
  ),
);

/**
 * Promise-friendly API client for React components.
 *
 * Every method returns the typed endpoint response and rejects on unexpected
 * transport failures; HTTP error responses are surfaced by status.
 */
export const api = HttpApiClient.make(RarifyApi, {
  baseUrl: window.location.origin,
}).pipe(
  Effect.provide(browserHttpClient),
  Effect.runSync,
);

/** Endpoint methods grouped by their API group for convenient imports. */
export const apiGroups = {
  session: api.Session,
  dashboard: api.Dashboard,
  library: api.Library,
  achievements: api.Achievements,
  friends: api.Friends,
  preferences: api.Preferences,
  trackedGames: api.TrackedGames,
};
