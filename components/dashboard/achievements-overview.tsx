import { useMemo, useState } from "react";
import { Image } from "@/src/spa/next-compat";
import { Link } from "@/src/spa/next-compat";
import { AlertTriangle, ChevronRight, Crosshair, EyeOff, Flame, LayoutGrid } from "lucide-react";
import { RecentAchievements } from "@/components/dashboard/recent-achievements";
import { RarestAchievements } from "@/components/dashboard/rarest-achievements";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  selectNextUpGames,
  sortAchievementGames,
  type AchievementGameSort,
} from "@/src/domain/dashboard-calculations";
import { completionTierOf } from "@/lib/completion-tiers";
import { cn } from "@/lib/utils";
import type { Game } from "@/lib/types";
import type { AchievementsOverview } from "@/src/domain/dashboard";

/**
 * One cabinet tile: artwork with the count remaining over it, then the name,
 * trophy counts, and a completion bar.
 */
function CabinetGameCard({ game }: { game: Game }) {
  const tier = completionTierOf(game.completion);
  const remaining = game.achievements.total - game.achievements.earned;

  return (
    <Card className="border-border/50 bg-card [@media(hover:hover)_and_(pointer:fine)]:hover:border-foreground/20 motion-safe:transition-colors">
      <Link
        href={`/games/${game.appId}`}
        className="flex flex-col gap-2 rounded-xl p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        aria-label={`${game.name}: ${game.achievements.earned} of ${game.achievements.total} achievements unlocked`}
      >
        <span className="relative aspect-[460/215] w-full overflow-clip rounded-md bg-muted outline-1 outline-offset-[-1px] outline-foreground/10">
          <Image
            src={game.image}
            alt=""
            fill
            className="h-full w-full object-cover"
            sizes="208px"
          />
        </span>
        <span className="min-w-0 truncate text-sm font-semibold text-foreground">{game.name}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {game.achievements.earned}/{game.achievements.total} · {remaining} left
        </span>
        <span className="mbs-auto flex items-center gap-2 pbs-1">
          <Progress
            value={game.completion}
            aria-hidden
            indicatorClassName={tier.barClassName}
            className="h-1 min-w-0 flex-1"
          />
          <span className={cn("shrink-0 text-xs font-semibold tabular-nums", tier.textClassName)}>
            {game.completion}%
          </span>
        </span>
      </Link>
    </Card>
  );
}

const CABINET_SORTS = [
  "remaining",
  "completion",
  "name",
] as const satisfies ReadonlyArray<AchievementGameSort>;

/**
 * Every trophy game as artwork, sortable from a drop down menu.
 */
function TrophyCabinet({ games }: { games: ReadonlyArray<Game> }) {
  const [sort, setSort] = useState<AchievementGameSort>("remaining");
  const ordered = useMemo(() => sortAchievementGames(games, sort), [games, sort]);

  return (
    <section aria-labelledby="trophy-cabinet" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3
          id="trophy-cabinet"
          className="flex items-center gap-[0.5em] text-[length:var(--text-dashboard-cabinet-title)] font-semibold text-foreground"
        >
          <LayoutGrid className="size-[1.2cap] shrink-0 text-muted-foreground" aria-hidden />
          Trophy cabinet
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground tabular-nums">{ordered.length} games</p>
          <Select
            value={sort}
            onValueChange={(value) => {
              const next = CABINET_SORTS.find((candidate) => candidate === value);

              if (next) setSort(next);
            }}
          >
            <SelectTrigger
              aria-label="Sort trophy cabinet"
              className="h-8 w-40 border-border/50 bg-card text-xs"
            >
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="remaining">Fewest remaining</SelectItem>
                <SelectItem value="completion">Highest completion</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,13rem),1fr))] gap-3">
        {ordered.map((game) => (
          <CabinetGameCard key={game.appId} game={game} />
        ))}
      </div>
    </section>
  );
}

/**
 * Achievements trophy room: an actionable "up next" queue over the trophy
 * cabinet, beside the recent and rarest showcases in a side rail.
 *
 * Layout follows good-css.com: intrinsic grids size every card row so columns
 * follow the container with no breakpoint ladder; the content/rail split is
 * one `minmax()` grid that collapses to a single column on narrow screens;
 * images hold their shape with `aspect-ratio` + `object-fit: cover` plus an
 * inner outline; icons size in `cap` units; counts use `tabular-nums`; hover
 * styles only apply where hover exists; overflow is clipped.
 */
export function AchievementsOverview({ data }: { data: AchievementsOverview }) {
  const trophyGames = useMemo(
    () => data.games.filter((game) => game.achievements.total > 0),
    [data.games],
  );

  const nextUp = useMemo(() => selectNextUpGames(trophyGames, 3), [trophyGames]);

  return (
    <div className="dashboard-shell flex w-full">
      <Sidebar user={data.user} activeHref="/achievements" />
      <main className="min-w-0 flex-1 bg-background p-4 lg:p-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="-ms-4 -me-4 flex items-center gap-3 px-4 lg:hidden">
            <MobileSidebar user={data.user} activeHref="/achievements" />
          </div>

          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Trophy room
              </p>
              <h2 className="text-[length:var(--text-dashboard-section-title)] font-bold text-balance text-foreground">
                Achievements
              </h2>
            </div>
            {data.stats.achievementsEarnedDelta != null &&
              data.stats.achievementsEarnedDelta > 0 && (
                <Badge variant="secondary" className="text-xs tabular-nums">
                  <Flame className="size-[1.2cap] shrink-0 text-orange-400" aria-hidden />+
                  {data.stats.achievementsEarnedDelta} in the last 30 days
                </Badge>
              )}
          </div>

          {data.error ? (
            <Alert
              variant="destructive"
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              {data.error.type === "private_profile" ? (
                <EyeOff className="size-6" aria-hidden />
              ) : (
                <AlertTriangle className="size-6" aria-hidden />
              )}
              <AlertTitle>
                {data.error.type === "private_profile"
                  ? "Your Steam profile is private"
                  : "Couldn't fetch your Steam data"}
              </AlertTitle>
              <AlertDescription>
                {data.error.type === "private_profile"
                  ? "Set your profile and game details to public in Steam privacy settings, then refresh."
                  : `Steam API returned status ${data.error.status ?? "(network error)"}.`}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
                <div className="flex min-w-0 flex-col gap-6">
                  {nextUp.length > 0 && (
                    <Card className="border-border/50 bg-card">
                      <CardHeader className="flex flex-row items-center justify-between pbe-2">
                        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
                          <Crosshair
                            className="size-[1.2cap] shrink-0 text-amber-300"
                            aria-hidden
                          />
                          Up next · closest to perfect
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col pbs-2">
                        {nextUp.map((game, i) => {
                          const remaining = game.achievements.total - game.achievements.earned;
                          const tier = completionTierOf(game.completion);

                          return (
                            <div key={game.appId} className="flex flex-col">
                              {i !== 0 && (
                                <span className="border-t border-border/50" aria-hidden />
                              )}
                              <Link
                                href={`/games/${game.appId}`}
                                className="flex touch-manipulation items-center gap-4 pbs-3 pbe-3 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out active:scale-[0.99] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                <span className="w-6 shrink-0 text-center text-sm font-bold text-muted-foreground tabular-nums">
                                  {i + 1}
                                </span>
                                <span className="relative aspect-[460/215] w-20 shrink-0 grow-0 overflow-clip rounded bg-muted outline-1 outline-offset-[-1px] outline-foreground/10">
                                  <Image
                                    src={game.image}
                                    alt=""
                                    fill
                                    className="h-full w-full object-cover"
                                    sizes="80px"
                                  />
                                </span>
                                <span className="flex min-w-0 flex-1 flex-col gap-1">
                                  <span className="truncate text-sm font-semibold text-foreground">
                                    {game.name}
                                  </span>
                                  <span className="flex items-center gap-2">
                                    <Progress
                                      value={game.completion}
                                      aria-hidden
                                      indicatorClassName={tier.barClassName}
                                      className="h-1 min-w-0 flex-1"
                                    />
                                    <span
                                      className={cn(
                                        "shrink-0 text-xs font-semibold tabular-nums",
                                        tier.textClassName,
                                      )}
                                    >
                                      {game.completion}%
                                    </span>
                                  </span>
                                </span>
                                <Badge
                                  variant="secondary"
                                  className="hidden shrink-0 text-xs tabular-nums sm:inline-flex"
                                >
                                  {remaining} left
                                </Badge>
                                <ChevronRight
                                  className="size-[1.2cap] shrink-0 text-muted-foreground"
                                  aria-hidden
                                />
                              </Link>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}

                  <TrophyCabinet games={trophyGames} />
                </div>

                <aside
                  aria-label="Achievement highlights"
                  className="flex min-w-0 flex-col gap-4 lg:sticky lg:inset-bs-6"
                >
                  <RecentAchievements achievements={data.recentAchievements} />
                  <RarestAchievements achievements={data.rarestAchievements} />
                </aside>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
