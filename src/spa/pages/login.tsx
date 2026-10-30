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

const CAPABILITIES = [
  {
    title: "Completion",
    detail: "Every game in your library, scored and ranked.",
  },
  {
    title: "Rarity",
    detail: "Each unlock measured against every player who owns it.",
  },
  {
    title: "Perfect games",
    detail: "Every achievement in a game, earned.",
  },
  {
    title: "Friends",
    detail: "Your collection beside the people you play with.",
  },
] as const;

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
              <SignInButton className="w-full justify-center rounded-[3px] bg-vault-paper px-6 py-3.5 text-[15px] text-[#0a0d14] focus-visible:outline-vault-brass sm:w-auto [@media(hover:hover)_and_(pointer:fine)]:hover:bg-vault-paper/90" />
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

        <section
          aria-labelledby="capabilities-title"
          className="mt-auto border-t border-vault-line pb-8 pt-7 lg:pb-10"
        >
          <h2 id="capabilities-title" className="sr-only">
            What Rarify shows you
          </h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4 lg:gap-x-10">
            {CAPABILITIES.map((capability) => (
              <div key={capability.title}>
                <h3 className="font-display text-xl leading-tight text-vault-paper">
                  {capability.title}
                </h3>
                <p className="mt-1.5 max-w-[26ch] text-xs leading-relaxed text-vault-fog">
                  {capability.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-auto w-full max-w-[84rem] px-6 pb-6 sm:px-8 lg:px-12">
        <p className="text-[11px] text-vault-fog">Rarify is not affiliated with Valve or Steam.</p>
      </footer>
    </div>
  );
}
