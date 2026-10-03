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
    errorCode === null
      ? null
      : (ERROR_MESSAGES.get(errorCode) ?? "Something went wrong.");

  if (session.status === "ready" && session.data.authenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#030712] text-zinc-50">
      {/* background layers */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(59,130,246,0.22),transparent_60%),radial-gradient(ellipse_60%_40%_at_90%_80%,rgba(99,102,241,0.14),transparent_60%),radial-gradient(ellipse_50%_30%_at_10%_90%,rgba(16,185,129,0.09),transparent_60%)]" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(3,7,18,0.85)_100%)]" />
      </div>

      {/* hero */}
      <section className="relative z-10 flex flex-1 flex-col items-center px-6 pb-10 pt-10 md:pt-16">
        <h1 className="max-w-3xl text-center text-[36px] font-[800] leading-[0.95] tracking-[-0.03em] sm:text-[54px] md:text-[62px]">
          Your trophies
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
            deserve a vault.
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-center text-[15px] leading-relaxed text-white/55">
          Completion rates, rarity hunts, perfect games — your entire Steam library
          turned into a collection worth showing off. No extensions. No scraping.
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          {errorMessage && (
            <div
              role="alert"
              className="w-full max-w-sm rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200"
            >
              {errorMessage}
            </div>
          )}
          <div className="flex flex-col items-center gap-2.5">
            <div className="rounded-[14px] bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
              <SignInButton />
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <Lock className="h-3 w-3" /> We never see your password. Profile must be public.
            </p>
          </div>
          <p className="text-xs text-white/30">Takes ~10 seconds · Free forever</p>
        </div>

        {/* floating card stack — real Steam header art */}
        <div className="relative mt-10 flex w-full max-w-[740px] justify-center">
          <div className="absolute left-1/2 top-1/2 h-[320px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-[40px] bg-blue-500/15 blur-[50px]" />
          <div className="relative flex w-full max-w-[640px] items-end justify-center gap-3">
            {/* left card — BG3 */}
            <div className="hidden sm:flex w-[176px] shrink-0 -rotate-[4deg] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 backdrop-blur-xl translate-y-3">
              <div className="relative h-[98px] overflow-hidden">
                <Image
                  src={ROWS[2].header}
                  alt="Baldur's Gate 3 header art"
                  fill
                  sizes="176px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent" />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold leading-none">Baldur&apos;s Gate 3</div>
                <div className="mt-1 text-[11px] text-white/40">18 / 54 · 61%</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[61%] rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>
            {/* center hero card — Hades */}
            <div className="relative z-10 flex w-[228px] sm:w-[240px] shrink-0 flex-col overflow-hidden rounded-[20px] border border-white/15 bg-zinc-900 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)_inset] backdrop-blur-xl">
              <div className="absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black tracking-widest text-zinc-900 uppercase shadow">
                ★ Perfect
              </div>
              <div className="relative h-[136px] overflow-hidden">
                <Image
                  src={ROWS[1].header}
                  alt="Hades header art"
                  fill
                  priority
                  sizes="(max-width: 640px) 240px, 240px"
                  fetchPriority="high"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent" />
                <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur border border-white/15">
                  <Trophy className="h-3 w-3 text-amber-300" /> 49/49
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-sm font-bold leading-none">Hades</div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-emerald-300 font-medium">100% · Perfect</span>
                  <span className="text-white/30">94h</span>
                </div>
                <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-white/45">
                  <Zap className="h-3 w-3 text-amber-300" /> 6 rarest under 2%
                </div>
              </div>
            </div>
            {/* right card — Elden Ring */}
            <div className="hidden sm:flex w-[176px] shrink-0 rotate-[4deg] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/70 backdrop-blur-xl translate-y-3">
              <div className="relative h-[98px] overflow-hidden">
                <Image
                  src={ROWS[0].header}
                  alt="Elden Ring header art"
                  fill
                  sizes="176px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/60 to-transparent" />
              </div>
              <div className="p-3">
                <div className="text-xs font-semibold leading-none">Elden Ring</div>
                <div className="mt-1 text-[11px] text-white/40">40 / 42 · 98%</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[98%] rounded-full bg-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* stats ticker */}
        <div className="mt-10 flex w-full max-w-3xl flex-col items-center gap-3">
          <div className="flex w-full items-center gap-2 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] p-1.5 backdrop-blur">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="flex flex-1 items-center gap-2.5 rounded-xl bg-white/[0.06] px-3 py-2.5 border border-white/[0.06]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-900">
                  <s.icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-none tabular-nums">{s.value}</div>
                  <div className="text-[11px] leading-none text-white/45">{s.label}</div>
                </div>
              </div>
            ))}
            <div className="hidden sm:flex flex-1 items-center gap-2.5 rounded-xl bg-emerald-500 px-3 py-2.5 text-zinc-900">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-emerald-300">
                <Star className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-bold leading-none">3</div>
                <div className="text-[11px] leading-none opacity-70">perfect games</div>
              </div>
            </div>
          </div>
          <p className="text-[11px] tracking-wide text-white/25">Preview data — replaced by your library after sign-in</p>
        </div>
      </section>
    </main>
  );
}
