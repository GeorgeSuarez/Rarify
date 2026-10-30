import { Navigate, useSearchParams } from "react-router";
import { Lock } from "lucide-react";
import { Image } from "../next-compat.tsx";
import { SignInButton } from "@/components/dashboard/sign-in-button";
import { completionTierOf } from "@/lib/completion-tiers";
import { cn } from "@/lib/utils";
import { useApi } from "../use-api.ts";
import { apiGroups } from "../api.ts";

const headerFor = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

/**
 * The example vault on the login page. It is deliberately labelled as an
 * example: before sign-in there is no visitor data to show.
 */
const PREVIEW_RAREST = {
  name: "God of Blood",
  game: "Hades",
  hours: 94,
  globalPercent: 1.8,
  image: headerFor(1145360),
} as const;

const PREVIEW_GAMES = [
  {
    appId: 1145360,
    name: "Hades",
    earned: 49,
    total: 49,
    completion: 100,
    barWidthClassName: "w-full",
  },
  {
    appId: 1245620,
    name: "Elden Ring",
    earned: 40,
    total: 42,
    completion: 95,
    barWidthClassName: "w-[95%]",
  },
  {
    appId: 1086940,
    name: "Baldur's Gate 3",
    earned: 33,
    total: 54,
    completion: 61,
    barWidthClassName: "w-[61%]",
  },
] as const;

const LOGIN_CTA_CLASS =
  "w-full justify-center rounded-[3px] bg-vault-paper px-6 py-3.5 text-[15px] text-[#0a0d14] focus-visible:outline-vault-brass sm:w-auto [@media(hover:hover)_and_(pointer:fine)]:hover:bg-vault-paper/90";

const ERROR_MESSAGES = new Map<string, string>([
  ["auth_failed", "Steam could not verify your sign-in. Please try again."],
  ["no_steamid", "We couldn't read your Steam ID. Please try again."],
  ["db_error", "We couldn't save your profile. Your session still works."],
]);

/** Monogram stamp, matching the sidebar's letter mark in the login palette. */
function VaultMark() {
  return (
    <span
      aria-hidden
      className="flex size-7 shrink-0 items-center justify-center rounded-[2px] border border-vault-brass/40 text-[13px] font-semibold leading-none text-vault-brass"
    >
      R
    </span>
  );
}

/** Brass-framed product screenshot used by the feature tour. */
function ProductPlate({
  src,
  alt,
  width,
  height,
}: {
  readonly src: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
}) {
  return (
    <div className="login-plate">
      <img src={src} alt={alt} width={width} height={height} loading="eager" decoding="async" />
    </div>
  );
}

/**
 * Steam sign-in screen; signed-in visitors are sent straight to the dashboard.
 *
 * The public face of Rarify is laid out as a collector's vitrine: an editorial
 * statement and Steam sign-in on the left, and one brass-framed case on the
 * right holding an explicitly labelled example of the product's output.
 */
export function LoginPage() {
  const [searchParams] = useSearchParams();
  const session = useApi(() => apiGroups.session.getSessionStatus(), []);
  const errorCode = searchParams.get("error");

  const errorMessage =
    errorCode === null ? null : (ERROR_MESSAGES.get(errorCode) ?? "Something went wrong.");

  if (session.status === "ready" && session.data.authenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-wall flex min-h-svh w-full flex-col overflow-x-clip text-vault-paper">
      <header className="mx-auto flex w-full max-w-[84rem] items-center gap-3 px-6 pt-6 sm:px-8 lg:px-12 lg:pt-8">
        <VaultMark />
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-vault-paper">
          Rarify
        </span>
        <span className="ms-auto hidden text-xs font-medium text-vault-fog sm:block">
          Steam achievement vault
        </span>
      </header>

      <main className="mx-auto flex w-full max-w-[84rem] flex-1 flex-col px-6 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 items-start gap-12 pb-14 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16 lg:pb-20 lg:pt-16 xl:gap-20">
          <section className="min-w-0 max-w-[35rem] lg:pt-5">
            <h1 className="font-display text-[clamp(2.75rem,5.6vw,4.9rem)] font-medium leading-[0.94] tracking-[-0.03em] text-vault-paper">
              Find your <br />
              rarest trophies.
            </h1>
            <p className="mt-6 max-w-[46ch] text-[15px] leading-[1.75] text-vault-fog sm:text-base">
              Completion rates, perfect games, and the achievements almost nobody has. Rarify reads
              your public Steam library and turns it into a collection you can see at a glance.
            </p>

            <div className="mt-8">
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-4 max-w-[30rem] border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm leading-relaxed text-vault-paper"
                >
                  {errorMessage}
                </div>
              )}
              <SignInButton className={LOGIN_CTA_CLASS} />
              <p className="mt-4 flex max-w-[42ch] items-start gap-2 text-xs leading-relaxed text-vault-fog">
                <Lock className="mt-[0.2em] size-3 shrink-0" aria-hidden />
                Steam handles the sign-in. Rarify reads public profile data and never sees your
                password.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="vault-preview-title"
            className="login-case w-full min-w-0 justify-self-end lg:max-w-[38rem]"
          >
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4 border-b border-vault-line pb-4">
                <div className="min-w-0">
                  <h2
                    id="vault-preview-title"
                    className="font-display text-[1.55rem] leading-none tracking-[-0.015em] text-vault-paper sm:text-[1.7rem]"
                  >
                    Inside a vault
                  </h2>
                  <p className="mt-1.5 text-xs leading-relaxed text-vault-fog">
                    Rarest first, then what&apos;s closest to finished.
                  </p>
                </div>
                <span className="mt-0.5 shrink-0 bg-white/5 px-2 py-1 text-[11px] font-medium text-vault-fog">
                  Example
                </span>
              </div>

              <figure className="mt-5">
                <div className="relative aspect-[460/215] overflow-clip border border-white/10 bg-white/5">
                  <Image
                    src={PREVIEW_RAREST.image}
                    alt=""
                    fill
                    priority
                    fetchPriority="high"
                    sizes="(max-width: 640px) calc(100vw - 5rem), 600px"
                    className="h-full w-full object-cover"
                  />
                  <div
                    className="absolute inset-0 bg-linear-to-t from-background/60 via-transparent to-transparent"
                    aria-hidden
                  />
                </div>
                <figcaption className="mt-3 flex items-start justify-between gap-5">
                  <div className="min-w-0">
                    <p className="font-display text-[1.6rem] leading-tight tracking-[-0.01em] text-vault-paper sm:text-[1.75rem]">
                      {PREVIEW_RAREST.name}
                    </p>
                    <p className="mt-1 text-xs text-vault-fog">
                      {PREVIEW_RAREST.game}, {PREVIEW_RAREST.hours} hours played
                    </p>
                  </div>
                  <div className="shrink-0 text-end">
                    <p className="font-display text-[1.7rem] leading-none text-vault-brass tabular-nums">
                      {PREVIEW_RAREST.globalPercent}%
                    </p>
                    <p className="mt-1 text-xs text-vault-fog">of players</p>
                  </div>
                </figcaption>
              </figure>

              <div className="mt-5 border-t border-vault-line pt-4">
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-[1.15rem] leading-tight text-vault-paper">
                    Closest to finished
                  </h3>
                  <span className="text-xs text-vault-fog">3 of 7 games</span>
                </div>
                <ol className="mt-1.5">
                  {PREVIEW_GAMES.map((game) => {
                    const tier = completionTierOf(game.completion);

                    return (
                      <li key={game.appId} className="border-t border-vault-line py-3">
                        <div className="flex items-baseline justify-between gap-4">
                          <p className="truncate text-sm font-medium text-vault-paper">
                            {game.name}
                          </p>
                          <p
                            className={cn(
                              "shrink-0 text-sm font-semibold tabular-nums",
                              tier.textClassName,
                            )}
                          >
                            {game.completion}%
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-vault-fog tabular-nums">
                          {game.earned} of {game.total} achievements
                        </p>
                        <div className="mt-2 h-0.5 w-full overflow-clip bg-white/10">
                          <div
                            className={cn(
                              "login-bar h-full",
                              tier.barClassName,
                              game.barWidthClassName,
                            )}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t border-vault-line pt-4 text-xs text-vault-fog">
                <p>
                  <span className="font-semibold text-vault-paper tabular-nums">61%</span> average
                  completion
                </p>
                <p>
                  <span className="font-semibold text-vault-paper tabular-nums">2</span> perfect
                  games
                </p>
              </div>
            </div>
          </section>
        </div>

        <section aria-labelledby="tour-title" className="border-t border-vault-line py-14 lg:py-20">
          <div className="grid gap-5 lg:grid-cols-2 lg:items-end lg:gap-12">
            <h2
              id="tour-title"
              className="max-w-[14ch] font-display text-[clamp(2.25rem,4.2vw,3.5rem)] font-medium leading-[0.98] tracking-[-0.025em] text-vault-paper"
            >
              A closer look inside the vault.
            </h2>
            <p className="max-w-[48ch] text-sm leading-[1.75] text-vault-fog lg:justify-self-end lg:pb-1">
              Real dashboard screens, populated with example data. Sign in to see the same views
              with your own library.
            </p>
          </div>

          <figure className="mt-12 lg:mt-16">
            <ProductPlate
              src="/product/overview.webp"
              alt="The Overview screen: achievements earned, average completion, games owned, and games tracked above top games with completion and community comparison."
              width={1360}
              height={790}
            />
            <figcaption className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-8 lg:mt-6">
              <h3 className="font-display text-[1.75rem] leading-[1.05] tracking-[-0.015em] text-vault-paper">
                Everything you own, scored.
              </h3>
              <div className="max-w-[58ch]">
                <p className="text-sm leading-[1.75] text-vault-fog">
                  Your completion, perfect games, tracked titles, and the next trophy to chase.
                  Every game also carries its community comparison, so you know whether you&apos;re
                  ahead or behind.
                </p>
                <p className="mt-3 text-xs leading-relaxed text-vault-fog">
                  Snapshots over time, friend comparisons, and filters for all, owned, or tracked
                  games.
                </p>
              </div>
            </figcaption>
          </figure>

          <div className="mt-14 grid gap-12 lg:mt-20 xl:grid-cols-2 xl:gap-8">
            <figure>
              <ProductPlate
                src="/product/achievements.webp"
                alt="The Achievements screen: games closest to perfect, the trophy cabinet with completion bars, latest unlocks, and rarest trophies."
                width={1360}
                height={850}
              />
              <figcaption className="mt-4">
                <h3 className="font-display text-[1.6rem] leading-tight tracking-[-0.01em] text-vault-paper">
                  Rarity, on every trophy.
                </h3>
                <p className="mt-2 max-w-[46ch] text-sm leading-[1.7] text-vault-fog">
                  The trophy cabinet sorts every game by what&apos;s closest to finished, while
                  global unlock rates mark the achievements almost nobody has.
                </p>
              </figcaption>
            </figure>

            <figure>
              <ProductPlate
                src="/product/insights.webp"
                alt="The Insights screen: achievement portfolio, closest to perfect, recent unlocks, tracked game health, playtime distribution, and rarity distribution."
                width={1360}
                height={850}
              />
              <figcaption className="mt-4">
                <h3 className="font-display text-[1.6rem] leading-tight tracking-[-0.01em] text-vault-paper">
                  The shape of your collection.
                </h3>
                <p className="mt-2 max-w-[46ch] text-sm leading-[1.7] text-vault-fog">
                  Weighted completion, backlog, playtime bands, unlock velocity, and rarity
                  distribution. Insights shows where the collection is growing and where it stalled.
                </p>
              </figcaption>
            </figure>
          </div>

          <div className="mt-14 flex flex-col gap-5 border-t border-vault-line pt-8 sm:flex-row sm:items-center sm:justify-between lg:mt-20">
            <div>
              <h3 className="font-display text-2xl leading-tight text-vault-paper">
                See your own vault.
              </h3>
              <p className="mt-1 text-sm text-vault-fog">
                Sign in with Steam and the dashboard fills with your library.
              </p>
            </div>
            <SignInButton className={LOGIN_CTA_CLASS} />
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-[84rem] px-6 pb-6 sm:px-8 lg:px-12">
        <p className="text-[11px] text-vault-fog">Rarify is not affiliated with Valve or Steam.</p>
      </footer>
    </div>
  );
}
