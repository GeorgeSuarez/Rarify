# Rarify

A Steam-style achievement dashboard: Vite + React 19 SPA, Effect-native Cloudflare Worker API, D1 storage, deployed with Alchemy.

## Commands

- `npm run dev` — start the SPA dev server (Vite, http://localhost:5173)
- `npm run alchemy:dev` — run the whole Cloudflare stack locally (API Worker on http://localhost:8787, Vite website on http://localhost:5173)
- `npm run build` — production build of the SPA
- `npm run alchemy:deploy` — deploy the Cloudflare stack (Worker, D1, Cron Trigger, custom domain routes)
- `npm run lint` — run Oxlint (includes the vendored `anti-slop` and `anti-slop-effect` plugins in `tools/oxlint/anti-slop/`; see its `UPSTREAM.md` for provenance and `oxlint.config.ts` for enabled rules)
- `npm run format` — format the repository with Oxfmt (config: `.oxfmtrc.json`)
- `npm run format:check` — verify formatting without rewriting files
- `npm run typecheck` — `tsc --noEmit`
- `npm run test` — run unit tests once (Vitest)
- `npm run test:watch` — run tests in watch mode

Always run `npm run lint`, `npm run format:check`, `npm run typecheck`, `npm run test`, and `npm run build` after making changes.

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `STEAM_API_KEY` — Steam Web API key (steamcommunity.com/dev/apikey)
- `AUTH_SECRET` — random secret for signing session JWTs (`openssl rand -base64 32`)
- `PUBLIC_APP_URL` — public base URL of the SPA and API, no trailing slash (used for OpenID `return_to`/`realm`)
- `PUBLIC_APP_DOMAIN` — optional hostname served by the Alchemy stack (`rarify.georgejsuarez.com` in production); omit for local `alchemy dev`

Alchemy reads Cloudflare credentials from its own profile store (`alchemy profile edit --add Cloudflare`); no Cloudflare tokens are needed in `.env.local`.

## Architecture

- `src/spa/` — React Router SPA: `api.ts` (typed `HttpApiClient`), `use-api.ts` (loading/unauthorized/error hook), `pages/` (route screens), `next-compat.tsx` (`Image`/`Link` shims used by the existing dashboard components).
- `src/api-worker.ts` — Alchemy `Cloudflare.Worker` composition root: resolves D1 + secrets, builds application services once per isolate, registers `/api/*` handlers, `/auth/*` redirect routes, and the daily snapshot Cron Trigger.
- `src/api/` — `contracts.ts` (schema-validated `HttpApi`), `handlers.ts` (group handlers), `auth-routes.ts` (Steam OpenID + logout), `session-cookie.ts` (HTTP-only cookie policy).
- `src/services/` — capability interfaces and tags: `steam-client.ts`, `steam-openid.ts`, `session.ts`, `steam-login.ts`, `rarify-store.ts`, `dashboard.ts`, `preferences.ts`, `tracked-games.ts`, `snapshot-job.ts`.
- `src/adapters/` — concrete Layers: `steam-web-api.ts` (Fetch-based Steam client), `steam-openid.ts`, `session-jwt.ts` (jose), `d1-store.ts` (Effect SQL over D1), `dashboard-service.ts`, `preferences-service.ts`, `tracked-games-service.ts`, `snapshot-job.ts`.
- `src/domain/` — pure domain modules: `library.ts` (snapshot and per-game achievement cache schemas + TTLs), `dashboard-calculations.ts` (stats, filters, rarity buckets, achievement summaries, game rows), `dashboard.ts` (read-model schemas), `game-images.ts`.
- Steam enrichment is bounded: each request enriches at most `ENRICH_BATCH_SIZE` games (default 20; two Steam subrequests each) and stores them in the `game_achievements` D1 table for 24 hours. The rest of the library fills in on later loads, which keeps a Worker invocation inside Cloudflare's subrequest budget. The library snapshot TTL is 60 seconds so successive loads continue the fill; raise `ENRICH_BATCH_SIZE` on the Workers Paid plan.
- `src/database.ts`, `src/website.ts`, `alchemy.run.ts` — D1 resource (migrations in `migrations/`), Vite website resource, and the Stack.
- `lib/types.ts` — shared Effect schemas and types (domain + Steam API wire shapes).
- `components/dashboard/`, `components/ui/` — props-driven React views and shadcn/ui primitives.
- `tests/` — Vitest unit, HTTP API, and service tests with Steam fixtures.

## Auth flow

1. The SPA calls `GET /api/session`; when unauthenticated it redirects to `/login`.
2. "Sign in through Steam" → `GET /auth/steam` → Steam OpenID with `return_to`/`realm` set to `PUBLIC_APP_URL`.
3. Steam redirects to `GET /auth/steam/callback` → the Worker verifies the assertion with Steam, upserts the user profile in D1 (best-effort), signs a 30-day session JWT, and sets the HTTP-only `rarify_session` cookie.
4. Logout: `POST /auth/logout` (form post from the sidebar) → expires the cookie and redirects to `/login`.

## Snapshot cron

- `Cloudflare.Workers.cron("0 0 * * *", ...)` in `src/api-worker.ts` runs the daily snapshot job; there is no public HTTP cron endpoint.
- Each user is processed independently with a typed failure count; `recordDailySnapshot` upserts on `(steam_id, date)`, so retries cannot duplicate rows.
- Without snapshots, `avgCompletionDelta` and `gamesOwnedDelta` stay `null`.

## Theme

Dark navy/blue theme defined via CSS variables in `src/styles/globals.css`. Charts use `currentColor` + token classes, not hardcoded hex. Completion percentages are colored by tier through `lib/completion-tiers.ts` (`completionTierOf`): gray untouched, then red, orange, yellow, lime, and green as progress rises.
