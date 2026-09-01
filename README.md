# Rarify

A Steam-style achievement dashboard built with Next.js, React 19, Tailwind CSS v4, and shadcn/ui. Track your Steam achievements, compare progress with friends, and monitor your gaming stats over time.

## Features

- **Steam sign-in** — Authenticate via Steam OpenID (no passwords)
- **Achievement overview** — See total achievements earned, average completion, perfect games, and recent unlocks
- **Community comparison** — Compare your per-game completion against the Steam community average
- **Friends comparison** — Compare your overall stats head-to-head against a friend
- **Game browser** — Browse your Steam library with sortable stats and per-game achievement data
- **Tracked games** — Pin specific games for quick filtering
- **Nightly snapshots** — Automatic daily snapshots to compute deltas (trending up or down)

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Next.js](https://nextjs.org) 16 (App Router) |
| UI | [React](https://react.dev) 19, [Tailwind CSS](https://tailwindcss.com) v4, [shadcn/ui](https://ui.shadcn.com) |
| Database | [Turso](https://turso.tech) / libSQL via [Drizzle ORM](https://orm.drizzle.team) |
| Auth | Steam OpenID + signed JWTs ([jose](https://github.com/panva/jose)) |
| Steam API | Typed, cached client with tiered revalidation |
| Testing | [Vitest](https://vitest.dev) |
| Deployment | [Vercel](https://vercel.com) |

## Getting started

### Prerequisites

- Node.js 20+
- A [Steam Web API key](https://steamcommunity.com/dev/apikey)
- (Optional) A [Turso](https://turso.tech) database for production

### Setup

```bash
git clone <repo>
cd Rarify
npm install
```

Copy the environment template and fill in your values:

```bash
cp .env.example .env.local
```

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `STEAM_API_KEY` | Yes | Steam Web API key |
| `AUTH_SECRET` | Yes | Random secret for signing JWTs (`openssl rand -base64 32`) |
| `TURSO_DATABASE_URL` | Dev default | `file:local.db` for dev, remote Turso URL for production |
| `TURSO_AUTH_TOKEN` | Remote DB | Turso auth token (omit for local file DB) |
| `NEXT_PUBLIC_APP_URL` | Production | Public base URL, no trailing slash (used for OpenID `return_to`) |
| `CRON_SECRET` | Cron | Secret for the snapshot cron endpoint |

### Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # Run ESLint
npm run test         # Run unit tests (Vitest)
npm run test:watch   # Run tests in watch mode
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply pending migrations
npm run db:studio    # Open Drizzle Studio
```

### Database

For local development, the app uses a SQLite file (`local.db`). Initialize it:

```bash
npm run db:migrate
```

For production, create a free database at [turso.tech](https://turso.tech) and set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your environment.

## Architecture

```
app/
├── page.tsx                     # SSR dashboard (session-gated)
├── login/page.tsx               # Steam sign-in page
├── auth/steam/route.ts          # Initiate Steam OpenID flow
├── auth/steam/callback/route.ts # OpenID callback + user upsert
├── auth/logout/route.ts         # Clear session
├── api/dashboard/route.ts       # JSON endpoint for filter changes
├── api/tracked-games/route.ts   # Toggle tracked games
├── api/cron/snapshot/route.ts   # Nightly snapshot writer
├── robots.ts / sitemap.ts       # SEO
components/
├── dashboard/                   # Feature components (props-driven)
│   ├── dashboard-view.tsx       # Client wrapper (filter state)
│   ├── stats-cards.tsx
│   ├── top-games.tsx
│   ├── sidebar.tsx
│   └── mobile-sidebar.tsx
└── ui/                          # shadcn/ui primitives
lib/
├── auth.ts                      # Session helpers (jose JWTs)
├── dashboard.ts                 # getLibrarySnapshot seam + thin page projections
├── steam.ts                     # Typed, cached Steam Web API client
├── env.ts                       # Typed env var access
├── types.ts                     # Shared interfaces
├── utils.ts                     # Utility functions
└── db/
    ├── client.ts                # Drizzle + libSQL client (lazy)
    └── schema.ts                # Drizzle schema (users, tracked_games, snapshots)
```

### Auth flow

1. Visit `/` → `getSession()` → no session → redirect to `/login`
2. Click "Sign in through Steam" → redirect to Steam OpenID
3. Steam redirects back → verify identity → upsert user → create JWT session → redirect to `/`
4. Logout: `POST /auth/logout` → clear session → redirect to `/login`

### Snapshot cron

A nightly cron populates the `snapshots` table for computing deltas (average completion change, games owned change). The endpoint requires `Authorization: Bearer <CRON_SECRET>`. Configured in `vercel.json` runs daily at midnight UTC.

## Deployment

Deploy to Vercel:

1. Push to GitHub
2. Import in Vercel
3. Set all required environment variables in the Vercel project dashboard (Production environment)
4. Deploy — the app handles local file DB fallback gracefully in serverless

## License

MIT
