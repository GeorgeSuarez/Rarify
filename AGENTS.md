<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Rarify

A Steam-style achievement dashboard built with Next.js 16, React 19, Tailwind v4, and shadcn/ui.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — run Oxlint (includes the custom `anti-slop` plugin in `tools/oxlint/`)
- `npm run test` — run unit tests once (Vitest)
- `npm run test:watch` — run tests in watch mode
- `npm run db:generate` — generate Drizzle migrations from schema changes
- `npm run db:migrate` — apply pending migrations
- `npm run db:studio` — open Drizzle Studio (DB browser)

Always run `npm run lint`, `npm run build`, and `npm run test` after making changes.

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `STEAM_API_KEY` — Steam Web API key (steamcommunity.com/dev/apikey)
- `TURSO_DATABASE_URL` — `file:local.db` for dev, or your Turso URL for prod
- `TURSO_AUTH_TOKEN` — Turso auth token (omit for local file DB)
- `AUTH_SECRET` — random secret for signing session JWTs (`openssl rand -base64 32`)
- `NEXT_PUBLIC_APP_URL` — public base URL, no trailing slash (used for OpenID return_to)
- `STEAM_CALLBACK_BASE_URL` — optional override for the OpenID `return_to`/`realm` when using a tunnel during local dev (falls back to `NEXT_PUBLIC_APP_URL`)
- `CRON_SECRET` — secret for the snapshot cron endpoint (`openssl rand -base64 32`)

## Architecture

- `app/` — Next.js App Router: `page.tsx` (SSR, session-gated), `loading.tsx` (skeleton), `error.tsx` (global error boundary), `not-found.tsx`, `login/page.tsx` (Steam sign-in), `auth/steam/route.ts` + `auth/steam/callback/route.ts` (OpenID), `auth/logout/route.ts`, `api/dashboard/route.ts` (GET), `api/tracked-games/route.ts` (POST/DELETE toggle), `api/cron/snapshot/route.ts` (nightly snapshot writer), `robots.ts`, `sitemap.ts`.
- `lib/auth.ts` — session helpers (jose JWT in httpOnly cookie): `createSession`, `getSession`, `clearSession`.
- `lib/env.ts` — typed, lazy env var access.
- `lib/db/schema.ts` — Drizzle schema (`users`, `tracked_games`, `snapshots`, `user_preferences`).
- `lib/db/client.ts` — Drizzle + libSQL/Turso client.
- `drizzle/` — generated SQL migrations.
- `lib/steam.ts` — typed, cached Steam Web API client (`unstable_cache` with tiered revalidation).
- `lib/dashboard.ts` — async data layer. `getLibrarySnapshot` is the deep module that builds the enriched library once per request (`react cache()`); `getDashboardData`, `getGamesData`, `getAchievementsData`, and `snapshotUser` are thin projections over it.
- `lib/settings.ts` — user preference read/write (`getPreferences`, `savePreferences`).
- `lib/types.ts` — shared TypeScript interfaces (UI + Steam raw types).
- `components/dashboard/` — dashboard feature components (props-driven). `dashboard-view.tsx` is the client wrapper managing filter state. `top-games.tsx` has a track toggle.
- `components/ui/` — shadcn/ui primitives.
- `tests/` — Vitest unit tests + Steam API fixtures.

## Auth flow

1. User visits `/` → `getSession()` → no session → redirect to `/login`.
2. User clicks "Sign in through Steam" → `/auth/steam` → redirect to Steam OpenID.
3. Steam redirects back to `/auth/steam/callback` → verify with Steam → extract SteamID → upsert user in DB → `createSession()` → redirect to `/`.
4. Logout: `POST /auth/logout` → `clearSession()` → redirect to `/login`.

## Snapshot cron

A nightly cron job populates the `snapshots` table for delta computation (avg completion change, games owned change).

- Endpoint: `GET /api/cron/snapshot` (requires `Authorization: Bearer <CRON_SECRET>`)
- On Vercel: add a cron config in `vercel.json` hitting this endpoint daily.
- Locally: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/snapshot`
- Without snapshots, `avgCompletionDelta` and `gamesOwnedDelta` stay `null`.

## Theme

Dark navy/blue theme defined via CSS variables in `app/globals.css`. Charts use `currentColor` + token classes, not hardcoded hex.
