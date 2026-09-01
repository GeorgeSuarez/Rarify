# Cloudflare deployment plan for Rarify

## Target architecture

Deploy the existing Next.js 16 App Router application to **Cloudflare Workers via OpenNext**, using `https://rarify.georgejsuarez.com` as the assumed production hostname.

- Hosting: Cloudflare Workers + `@opennextjs/cloudflare`
- Database: production Turso/libSQL database
- Cache: R2-backed OpenNext incremental cache
- Images: Cloudflare Images binding or custom Cloudflare image loader
- Scheduled snapshots: Cloudflare Cron Trigger and a custom Worker `scheduled()` handler
- CI/CD: Cloudflare Workers Builds connected to GitHub

## 1. Preflight

- Confirm the exact subdomain; this plan assumes `rarify.georgejsuarez.com`.
- Confirm `georgejsuarez.com` is an active Cloudflare zone.
- Identify/create the production Turso database.
- Prepare Steam API, Turso, auth, and cron credentials.
- Decide whether Workers Paid is appropriate because dashboard requests and snapshot jobs make many external API calls.

## 2. Add the OpenNext deployment layer

- Add current compatible versions of `@opennextjs/cloudflare` and `wrangler`.
- Generate and review `wrangler.jsonc` and `open-next.config.ts` (the OpenNext migration command may automate the initial setup).
- Configure the Worker entry point, `.open-next/assets`, current compatibility date, `nodejs_compat`, and `global_fetch_strictly_public`.
- Add R2 incremental-cache configuration and an `NEXT_INC_CACHE_R2_BUCKET` binding.
- Add `preview`, `deploy`, and `cf-typegen` package scripts.
- Ignore `.open-next/` and add local Cloudflare development configuration without committing secrets.

## 3. Resolve runtime compatibility

### Turso/libSQL

The current code imports `@libsql/client`. Cloudflare’s Turso Worker guidance requires the web client entry point, so update and test the database client with `@libsql/client/web`.

Also:

- Keep `file:local.db` only for local development.
- Fail clearly if a deployed Worker lacks a remote Turso URL/token.
- Verify Drizzle’s libSQL adapter works with the web client.
- If the OpenNext build reports workerd bundling issues, adjust `serverExternalPackages` for the affected packages such as `@libsql/client`, `@libsql/isomorphic-ws`, or `jose`.

### Images

The project uses `next/image` in dashboard components. Configure an `IMAGES` Cloudflare Images binding, or use a custom Cloudflare image loader. Verify all existing Steam, avatar, DiceBear, and Placehold origins.

## 4. Production database

- Create/choose a production Turso database and back it up if it already contains data.
- Apply the checked-in Drizzle migrations to production using production credentials.
- Verify users, tracked games, snapshots, and preferences CRUD operations.
- Ensure the deployed Worker cannot accidentally fall back to the local SQLite file.

## 5. Environment configuration

Set `NEXT_PUBLIC_APP_URL` to:

```text
https://rarify.georgejsuarez.com
```

Configure it as a build variable and runtime variable as appropriate. Configure these as runtime secrets, never in source control:

```text
STEAM_API_KEY
TURSO_DATABASE_URL
TURSO_AUTH_TOKEN
AUTH_SECRET
CRON_SECRET
```

Leave `STEAM_CALLBACK_BASE_URL` unset in production unless an explicit override is needed; it should resolve to the production app URL. Use separate preview values/databases if preview deployments will be authenticated.

## 6. Replace the Vercel cron configuration

`vercel.json` will not schedule jobs on Cloudflare.

- Add `triggers.crons: ["0 0 * * *"]` to Wrangler.
- Add a custom Worker entry point that forwards normal traffic to the generated OpenNext fetch handler.
- Add a `scheduled()` handler that internally invokes `/api/cron/snapshot` with `Authorization: Bearer <CRON_SECRET>` and waits using `ctx.waitUntil()`.
- Keep the HTTP route protected for manual invocations.
- Test the scheduled handler with Wrangler’s local scheduled-event endpoint.
- Load-test the current sequential all-user snapshot implementation; move to Queues/Workflows later if user count or API volume makes one cron execution too large.

Remove or clearly deprecate the Vercel-only cron configuration and update the README deployment instructions.

## 7. Custom domain

After the Worker first deploys:

1. Open Workers & Pages in Cloudflare.
2. Select the Worker.
3. Add `rarify.georgejsuarez.com` under **Settings → Domains & Routes → Custom Domain**.
4. Let Cloudflare create the DNS record and certificate.
5. Remove any conflicting existing CNAME before adding the Custom Domain.

## 8. CI/CD

Use Workers Builds with the production branch:

- Build: `npx @opennextjs/cloudflare build`
- Deploy: `npx @opennextjs/cloudflare deploy`

Configure build variables and runtime secrets in Cloudflare. Keep the Wrangler/OpenNext configuration in the repository. Generate Cloudflare environment types whenever bindings change.

## 9. Validation

Run the repository-required checks:

```bash
npm run lint
npm run build
npm run test
```

Then run the Cloudflare-compatible preview and validate:

- Steam OpenID callback uses the HTTPS custom domain.
- Secure, HttpOnly, SameSite session cookies work.
- Logout clears the session.
- Turso reads/writes and migrations work.
- Dashboard, settings, tracked-games, friends, and achievement routes work.
- Cron returns 401 without the bearer token and succeeds with it.
- `next/image` output works for every configured remote image host.
- Steam API caching behaves as expected with R2.
- Worker CPU time, subrequests, exceptions, and snapshot duration are acceptable.

## 10. Cutover and rollback

1. Deploy to the temporary `workers.dev` hostname.
2. Complete runtime and authentication smoke tests.
3. Attach the custom domain.
4. Verify the first scheduled snapshot and monitor logs/Turso usage.
5. Keep the old Vercel deployment temporarily as a rollback option.
6. Roll back the Worker version or remove the custom domain if production validation fails.
7. Remove Vercel only after the first successful production snapshot and stable authentication.

## Key risks

- The current non-web libSQL client may not run in Workers.
- `next/image` needs Cloudflare-specific configuration.
- Vercel cron configuration is not portable.
- Local SQLite fallback is unsafe for production.
- Snapshot jobs may outgrow one Worker invocation.
- Steam API volume makes persistent caching important.
- Public build variables and private runtime secrets must be configured separately.

## References

- Cloudflare Next.js Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- OpenNext setup: https://opennext.js.org/cloudflare/get-started
- OpenNext environment variables: https://opennext.js.org/cloudflare/howtos/env-vars
- OpenNext custom Worker: https://opennext.js.org/cloudflare/howtos/custom-worker
- Cloudflare Turso integration: https://developers.cloudflare.com/workers/databases/third-party-integrations/turso/
- OpenNext image optimization: https://opennext.js.org/cloudflare/howtos/image
- Cloudflare custom domains: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
