import { Navigate, useSearchParams } from "react-router";
import { Lock, Star, Target, Trophy, Zap, Flame } from "lucide-react";
import { Image } from "../next-compat.tsx";
import { SignInButton } from "@/components/dashboard/sign-in-button";
import { useApi } from "../use-api.ts";
import { apiGroups } from "../api.ts";

const headerFor = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

// Illustrative numbers so the showcase panel reads like the real product.
const STATS = [
  { icon: Trophy, value: "12,847", label: "achievements unlocked" },
  { icon: Flame, value: "34", label: "this month" },
  { icon: Target, value: "96%", label: "avg completion" },
] as const;

const ROWS = [
  { appId: 1245620, name: "Elden Ring", pct: 98, header: headerFor(1245620) },
  { appId: 1145360, name: "Hades", pct: 100, header: headerFor(1145360) },
  { appId: 1086940, name: "Baldur's Gate 3", pct: 61, header: headerFor(1086940) },
] as const;

const ERROR_MESSAGES = new Map<string, string>([
  ["auth_failed", "Steam could not verify your sign-in. Please try again."],
  ["no_steamid", "We couldn't read your Steam ID. Please try again."],
  ["db_error", "We couldn't save your profile. Your session still works."],
]);

/**
 * Steam sign-in screen; signed-in visitors are sent straight to the dashboard.
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
    <main className="relative flex min-h-screen w-full flex-col overflow-x-clip bg-background text-foreground">
      {/* background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_60%),radial-gradient(ellipse_60%_40%_at_90%_80%,color-mix(in_oklch,var(--chart-4)_14%,transparent),transparent_60%),radial-gradient(ellipse_50%_30%_at_10%_90%,color-mix(in_oklch,var(--chart-5)_9%,transparent),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(color-mix(in oklch, white 80%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklch, white 80%, transparent) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,color-mix(in_oklch,var(--background)_85%,transparent)_100%)]" />
      </div>

      {/* hero */}
      <section className="relative z-10 flex w-full flex-1 flex-col items-center px-6 pb-[var(--space-section)] pt-[var(--space-section)]">
        <h1 className="text-center text-[length:var(--text-hero)] font-extrabold leading-[0.95] tracking-[-0.03em] text-balance">
          <span className="bg-linear-to-r from-chart-1 via-chart-4 to-chart-3 bg-clip-text text-transparent">
            Rarify
          </span>
        </h1>
        <p className="mt-4 max-w-3xl text-center text-[clamp(1.5rem,1rem+2.5vw,2.25rem)] font-bold leading-[1.05] tracking-tight text-foreground text-balance">
          Your trophies deserve a vault.
        </p>
        <p className="mt-4 max-w-xl text-center text-[15px] leading-relaxed text-foreground/60">
          Completion rates, rarity hunts, perfect games — your entire Steam library turned into a
          collection worth showing off. No extensions. No scraping.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          {errorMessage && (
            <div
              role="alert"
              className="w-full max-w-sm rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-foreground"
            >
              {errorMessage}
            </div>
          )}
          <div className="flex flex-col items-center gap-2.5">
            <div className="rounded-[calc(var(--radius)_+_0.375rem)] bg-primary-foreground p-1.5 shadow-[0_12px_40px_color-mix(in_oklch,black_40%,transparent)]">
              <SignInButton />
            </div>
            <p className="flex items-center gap-[0.5em] text-xs font-medium text-foreground/70">
              <Lock className="size-[1cap] shrink-0" /> We never see your password. Profile must be
              public.
            </p>
          </div>
        </div>

        {/* floating card stack — real Steam header art */}
        <div className="relative mt-10 flex w-full max-w-185 justify-center [justify-content:safe_center]">
          <div className="absolute top-1/2 left-1/2 h-80 w-130 -translate-x-1/2 -translate-y-1/2 rounded-[40px] bg-primary/15 blur-[50px]" />
          <div className="relative flex w-full max-w-160 items-end justify-center gap-3 [justify-content:safe_center]">
            {/* left card — BG3 */}
            <div className="hidden w-44 shrink-0 translate-y-3 rotate-[-4deg] flex-col overflow-clip rounded-2xl border border-foreground/10 bg-card/70 backdrop-blur-xl sm:flex">
              <div className="stack relative aspect-[460/215] w-full overflow-clip bg-foreground/5">
                <Image
                  src={ROWS[2].header}
                  alt="Baldur's Gate 3 header art"
                  fill
                  sizes="176px"
                  className="h-full w-full object-cover"
                />
                <div className="bg-linear-to-t from-card/60 to-transparent" aria-hidden />
              </div>
              <div className="flex flex-col gap-1 p-3">
                <div className="truncate text-xs font-semibold leading-none">
                  Baldur&apos;s Gate 3
                </div>
                <div className="text-[11px] text-foreground/40 tabular-nums">18 / 54 · 61%</div>
                <div className="mt-1 h-1.5 overflow-clip rounded-full bg-foreground/10">
                  <div className="h-full w-[61%] rounded-full bg-chart-5" />
                </div>
              </div>
            </div>
            {/* center hero card — Hades */}
            <div className="relative z-10 flex w-57 shrink-0 flex-col overflow-clip rounded-[calc(var(--radius)_+_0.5rem)] border border-foreground/15 bg-card shadow-[0_20px_60px_color-mix(in_oklch,black_50%,transparent),0_0_0_1px_color-mix(in_oklch,white_6%,transparent)_inset] backdrop-blur-xl sm:w-60">
              <div className="stack relative aspect-video w-full overflow-clip bg-foreground/5">
                <Image
                  src={ROWS[1].header}
                  alt="Hades header art"
                  fill
                  priority
                  sizes="(max-width: 640px) 240px, 240px"
                  fetchPriority="high"
                  className="h-full w-full object-cover"
                />
                <div className="bg-linear-to-t from-card via-card/20 to-transparent" aria-hidden />
                <div className="place-self-start justify-self-center z-10 mt-3 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black tracking-widest text-zinc-900 uppercase shadow">
                  ★ Perfect
                </div>
                <div className="place-self-end justify-self-start z-10 m-2 flex items-center gap-[0.5em] rounded-full bg-background/60 px-2 py-1 text-[11px] font-medium text-foreground backdrop-blur border border-foreground/15">
                  <Trophy className="size-[1cap] shrink-0 text-amber-300" />{" "}
                  <span className="tabular-nums">49/49</span>
                </div>
              </div>
              <div className="flex flex-col gap-1 p-3.5">
                <div className="truncate text-sm font-bold leading-none">Hades</div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-chart-5 tabular-nums">100% · Perfect</span>
                  <span className="text-foreground/30 tabular-nums">94h</span>
                </div>
                <div className="mt-1.5 flex items-center gap-[0.5em] text-[11px] text-foreground/45">
                  <Zap className="size-[1cap] shrink-0 text-amber-300" /> 6 rarest under 2%
                </div>
              </div>
            </div>
            {/* right card — Elden Ring */}
            <div className="hidden w-44 shrink-0 translate-y-3 rotate-[4deg] flex-col overflow-clip rounded-2xl border border-foreground/10 bg-card/70 backdrop-blur-xl sm:flex">
              <div className="stack relative aspect-[460/215] w-full overflow-clip bg-foreground/5">
                <Image
                  src={ROWS[0].header}
                  alt="Elden Ring header art"
                  fill
                  sizes="176px"
                  className="h-full w-full object-cover"
                />
                <div className="bg-linear-to-t from-card/60 to-transparent" aria-hidden />
              </div>
              <div className="flex flex-col gap-1 p-3">
                <div className="truncate text-xs font-semibold leading-none">Elden Ring</div>
                <div className="text-[11px] text-foreground/40 tabular-nums">40 / 42 · 98%</div>
                <div className="mt-1 h-1.5 overflow-clip rounded-full bg-foreground/10">
                  <div className="h-full w-[98%] rounded-full bg-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* stats ticker */}
        <div className="mt-[var(--space-section)] w-full max-w-3xl">
          <div className="flex w-full items-center gap-2 overflow-clip rounded-2xl border border-border bg-foreground/[0.04] p-1.5 backdrop-blur">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-foreground/[0.06] bg-foreground/[0.06] px-3 py-2.5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-foreground text-background">
                  <s.icon className="h-4 w-4 shrink-0" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold leading-none tabular-nums">
                    {s.value}
                  </div>
                  <div className="mt-1 truncate text-[11px] leading-none text-foreground/45">
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
            <div className="hidden min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-chart-5 px-3 py-2.5 text-background sm:flex">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-chart-5">
                <Star className="h-4 w-4 shrink-0" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold leading-none tabular-nums">3</div>
                <div className="mt-1 truncate text-[11px] leading-none opacity-70">
                  perfect games
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
