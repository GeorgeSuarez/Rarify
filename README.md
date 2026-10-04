# Rarify

A Steam-style achievement dashboard. Track your Steam achievements, compare progress with friends, and monitor your gaming stats over time.

**Live:** https://rarify.georgejsuarez.com

- **Frontend** — Vite + React 19 SPA (React Router, Tailwind CSS v4, shadcn/ui)
- **API** — Effect-native Cloudflare Worker with schema-validated `HttpApi` endpoints
- **Storage** — Cloudflare D1 (SQLite) through Effect SQL
- **Infrastructure** — [Alchemy](https://alchemy.run) Stack: Worker, D1 database, migrations, custom-domain routes, and a daily Cron Trigger
- **Auth** — Steam OpenID + a signed, HTTP-only session cookie

## Features

- **Steam sign-in** — Authenticate via Steam OpenID (no passwords)
- **Achievement overview** — Total achievements earned, average completion, perfect games, and recent unlocks
- **Community comparison** — Compare your per-game completion against the Steam community average
- **Friends comparison** — Compare your overall stats head-to-head against a friend
- **Game browser** — Browse your Steam library with sortable stats and per-game achievement data
- **Tracked games** — Pin specific games for quick filtering
- **Nightly snapshots** — A Cloudflare Cron Trigger stores daily snapshots used for trend deltas

## Getting started

### Prerequisites

- Node.js 22+
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)
- A Cloudflare account with the `georgejsuarez.com` zone (for preview/production deploys)

### Setup

```bash
npm install
cp .env.example .env.local   # then fill in the values
```

Alchemy stores Cloudflare credentials in its own profile store; authenticate once with:

```bash
npx alchemy profile edit --add Cloudflare
```

### Environment variables

| Variable            | Required  | Description                                                                                                                                      |
| ------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `STEAM_API_KEY`     | Yes       | Steam Web API key                                                                                                                                |
| `AUTH_SECRET`       | Yes       | Random secret for signing session JWTs (`openssl rand -base64 32`)                                                                               |
| `PUBLIC_APP_URL`    | Local dev | Base URL for local `npm run dev` + `alchemy dev` (e.g. `http://localhost:5173`). Deploys derive the public URL from `PUBLIC_APP_DOMAIN` instead. |
| `PUBLIC_APP_DOMAIN` | Deploys   | Hostname served by the stack (`rarify.georgejsuarez.com`); omit for local `alchemy dev`                                                          |
| `ENRICH_BATCH_SIZE` | No        | Games enriched per request (default 20). Raise it on the Workers Paid plan.                                                                      |

### Commands

```bash
npm run dev             # Vite dev server for the SPA (http://localhost:5173)
npm run alchemy:dev     # whole stack locally: API Worker (:8787) + Vite website (:5173)
npm run build           # production build of the SPA
npm run alchemy:plan    # preview infrastructure changes
npm run alchemy:deploy  # deploy with PUBLIC_APP_DOMAIN set in the environment
npm run alchemy:preview  # deploy the preview stage (preview-rarify.georgejsuarez.com)
npm run alchemy:release  # deploy the production stage (rarify.georgejsuarez.com)
npm run alchemy:destroy  # tear down the stack (pass `-- --stage preview` for preview only)
npm run lint            # Oxlint (includes the custom anti-slop plugin)
npm run typecheck       # tsc --noEmit
npm run test            # unit, service, and HTTP API tests (Vitest)
npm run test:watch      # tests in watch mode
```

Local development runs the API in workerd with a local D1 simulator, so no cloud resources are needed.

## Architecture

```
alchemy.run.ts               # Alchemy Stack: D1 + website Worker + API Worker
src/
├── api-worker.ts            # API Worker composition root (services, routes, cron)
├── api/                     # HttpApi contract, handlers, auth routes, cookie policy
├── services/                # Capability interfaces and tags
│   ├── steam-client.ts      # Steam Web API reads
│   ├── steam-openid.ts      # Steam OpenID assertion verification
│   ├── session.ts           # Signed session tokens
│   ├── steam-login.ts       # Steam sign-in workflow
│   ├── rarify-store.ts      # Users, tracked games, preferences, snapshots,
│   │                        # library cache, per-game achievement cache
│   ├── dashboard.ts         # Dashboard read models
│   ├── preferences.ts       # Settings policy
│   ├── tracked-games.ts     # Track/untrack policy
│   └── snapshot-job.ts      # Daily snapshot run
├── adapters/                # Concrete Layers: Steam HTTP clients, jose sessions,
│                            # Effect-SQL D1 store, dashboard/preferences/tracking/
│                            # snapshot implementations
├── domain/                  # Pure schemas and calculations:
│                            # library snapshots, per-game cache, dashboard read
│                            # models, stats/filters/rarity math, game-image URLs
├── spa/                     # React Router app: typed API client, route screens,
│                            # loading/auth/error hook, next/image+next/link shims
├── styles/globals.css       # Tailwind theme tokens
├── website.ts               # Vite website resource (custom domain + SPA fallback)
└── deployment-routes.ts     # /api/* and /auth/* zone-route patterns
migrations/                  # D1 SQL migrations applied on deploy
components/                  # Dashboard views and shadcn/ui primitives
lib/types.ts                 # Shared Effect schemas and domain types
tests/                       # Unit, service, HTTP API, and schema tests
```

### Data flow

1. The SPA calls `GET /api/session`; unauthenticated visitors are redirected to `/login`.
2. `GET /api/dashboard`, `/api/games`, `/api/achievements`, `/api/friends`, `/api/settings`, and `/api/tracked-games` serve the typed read models used by each screen.
3. `DashboardService` builds an enriched library from Steam, caching per-game achievement data in D1 for 24 hours and falling back to the stale library snapshot when Steam errors. Each request enriches a bounded batch (default 20 games, `ENRICH_BATCH_SIZE`) so a Worker invocation stays inside Cloudflare's subrequest budget; later loads continue filling the library.
4. The daily Cron Trigger records one snapshot per account (idempotent on `(steam_id, date)`) for delta computation.

### Auth flow

1. "Sign in through Steam" → `GET /auth/steam` → Steam OpenID with `return_to`/`realm` derived from the deployed hostname (`PUBLIC_APP_DOMAIN`), or `PUBLIC_APP_URL` in local dev.
2. Steam redirects to `GET /auth/steam/callback` → the Worker verifies the assertion, upserts the profile, signs a 30-day session JWT, and sets the `rarify_session` HTTP-only cookie.
3. Logout: `POST /auth/logout` expires the cookie.

### Testing

```bash
npm run test            # all suites (unit, service, HTTP API, D1 schema)
npm run test:watch      # watch mode
```

Coverage by area:

- `dashboard.test.ts`, `snapshot-cache.test.ts` — pure calculations and versioned cache serialization/TTL
- `library.test.ts` — `DashboardService` through its real interface over a faithful in-memory store and scripted Steam client, including progressive enrichment across requests
- `api.test.ts`, `auth-routes.test.ts` — the HTTP API and auth redirect routes through `toWebHandler`, covering cookies, validation, and unauthorized paths
- `steam-client.test.ts`, `steam-openid.test.ts`, `session-token.test.ts` — adapter behavior against stubbed transports, including Steam's omitted fields, string percentages, and private-profile responses
- `d1-schema.test.ts` — the committed migrations applied to a real local SQLite database (uniqueness, foreign keys, domain checks)
- `deployment-routes.test.ts`, `snapshot-job.test.ts`, `preferences-and-tracking.test.ts` — routing, scheduling, and settings policy

Tests exercise real interfaces with faithful implementations — no module mocks. Time-sensitive paths use `TestClock`.

### Deployment

Authenticate once, then deploy a preview stage before the production cutover:

```bash
npx alchemy profile edit --add Cloudflare   # browser OAuth; or set CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
npm run alchemy:preview                     # preview-rarify.georgejsuarez.com (stage: preview)
npm run alchemy:release                     # rarify.georgejsuarez.com (stage: prod)
```

`alchemy:deploy` (with `PUBLIC_APP_DOMAIN` set) attaches the website Worker to the custom domain and routes `/api/*` and `/auth/*` to the API Worker on the same hostname. D1 migrations in `migrations/` are applied during deploy, and the daily Cron Trigger is registered with the Worker. No Turso data is imported: D1 starts empty and users sign in again.

Each stage gets its own D1 database (`preview` and `prod` are fully separate). Use a first-level subdomain for preview/production (`preview-rarify.georgejsuarez.com`) — Universal SSL does not cover second-level subdomains such as `preview.rarify.georgejsuarez.com`.

### CI/CD (GitHub Actions)

- **CI** (`.github/workflows/ci.yml`) — lint, typecheck, tests, and build on every push (except `main`) and pull request.
- **Preview** (`.github/workflows/preview.yml`) — deploys PRs to the shared `preview` stage. Pushes to `main` deploy production (`.github/workflows/release.yml`). Both verify first and skip gracefully until the secrets below exist.

Required repository secrets (`Settings → Secrets and variables → Actions`):

| Secret                  | Source                                                                  |
| ----------------------- | ----------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Minted by `stacks/github.ts` (see below)                                |
| `CLOUDFLARE_ACCOUNT_ID` | Minted by `stacks/github.ts` (or `CLOUDFLARE_ACCOUNT_ID` in your shell) |
| `STEAM_API_KEY`         | Your Steam Web API key                                                  |
| `AUTH_SECRET`           | Random secret (`openssl rand -base64 32`)                               |

`stacks/github.ts` is a one-shot bootstrap stack that mints the scoped CI token and pushes the Cloudflare secrets to GitHub. It needs an `admin` profile that can create tokens (Global API Key + email). Run once from your laptop:

```bash
npx alchemy profile create admin
npx alchemy profile edit --profile admin --add Cloudflare
npx alchemy deploy --config stacks/github.ts --profile admin --yes
```

Re-run it to rotate the token or change its permissions.

### Troubleshooting

- **Library loads but achievements are all zero** — the Steam account's **Game details** privacy must be Public (Steam → Profile → Edit Profile → Privacy Settings). The API returns `403 Profile is not public` otherwise, and the app keeps a basic row for each affected game.
- **Newly enriched games appear over several loads** — each request enriches at most `ENRICH_BATCH_SIZE` games so one Worker invocation stays inside Cloudflare's subrequest budget (50 on the free plan). Later loads continue filling the D1 cache; raise the batch size on Workers Paid.
- **Deploy asks for Cloudflare auth** — run `npx alchemy profile edit --add Cloudflare` (OAuth) or set `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.

## License

MIT
