import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "@/src/spa/next-compat";
import { completionTierOf } from "@/lib/completion-tiers";
import { Award, CalendarClock, Clock, Gamepad2, Target, TrendingUp, Trophy } from "lucide-react";
import {
  selectGamesNearCompletion,
  summarizeAchievementPortfolio,
  summarizeAchievementUnlockMomentum,
  summarizeCompletionBands,
  summarizeTrackedGameHealth,
  sumRarityDistributionCounts,
} from "@/src/domain/insights-calculations";
import type { DashboardData, Game } from "@/lib/types";

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <Progress value={pct} className="gap-0" indicatorStyle={{ backgroundColor: color }}>
      <span className="sr-only">{pct}%</span>
    </Progress>
  );
}

function PlaytimeSection({ data }: { data: DashboardData }) {
  const { totalHours, backlog, bands, maxBand } = useMemo(() => {
    const games = data.games;
    const totalHours = games.reduce((s, g) => s + g.hours, 0);
    const backlog = games.filter((g) => g.hours === 0).length;

    const bandDefs = [
      { label: "0h", min: 0, max: 0 },
      { label: "1-10h", min: 1, max: 10 },
      { label: "10-100h", min: 10, max: 100 },
      { label: "100h+", min: 100, max: Infinity },
    ];

    const bands = bandDefs.map((b) => ({
      ...b,
      count: games.filter((g) => g.hours >= b.min && g.hours < b.max).length,
    }));

    const maxBand = Math.max(...bands.map((b) => b.count), 1);

    return { totalHours, backlog, bands, maxBand };
  }, [data.games]);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <Clock className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
          Playtime Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground tabular-nums">
            {totalHours.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">total hours</span>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Backlog</p>
            <p className="text-xl font-bold text-foreground tabular-nums">{backlog}</p>
            <p className="text-[10px] text-muted-foreground">unplayed games</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Avg / game</p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              {data.games.length > 0 ? Math.round(totalHours / data.games.length) : 0}
            </p>
            <p className="text-[10px] text-muted-foreground">hours per game</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Playtime Distribution
          </p>
          {bands.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-end text-xs text-muted-foreground tabular-nums">
                {b.label}
              </span>
              <div className="min-w-0 flex-1">
                <MiniBar value={b.count} max={maxBand} color="var(--primary)" />
              </div>
              <span className="w-8 shrink-0 text-end text-xs font-medium text-foreground tabular-nums">
                {b.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RaritySection({ data }: { data: DashboardData }) {
  const tiers = data.rarityDistribution;
  const totalEarned = useMemo(() => sumRarityDistributionCounts(tiers), [tiers]);

  const maxCount = Math.max(...tiers.map((t) => t.count), 1);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <Trophy className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
          Rarity Distribution
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground tabular-nums">
            {totalEarned.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">achievements</span>
        </div>
        <div className="flex flex-col gap-3">
          {tiers.map((tier) => (
            <div key={tier.tier} className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate" style={{ color: tier.color }}>
                  {tier.tier}
                </span>
                <span className="shrink-0 text-foreground tabular-nums">
                  {tier.count}
                  <span className="ms-1 text-xs text-muted-foreground">
                    ({totalEarned > 0 ? Math.round((tier.count / totalEarned) * 100) : 0}
                    %)
                  </span>
                </span>
              </div>
              <MiniBar value={tier.count} max={maxCount} color={tier.color} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CompletionSection({ data }: { data: DashboardData }) {
  const bands = useMemo(() => summarizeCompletionBands(data.games), [data.games]);
  const maxBand = Math.max(...bands.map((band) => band.count), 1);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <Gamepad2 className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
          Completion Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground tabular-nums">
            {data.stats.avgCompletion}%
          </span>
          <span className="text-sm text-muted-foreground">average completion</span>
        </div>
        <div className="flex flex-col gap-2">
          {bands.map((band) => (
            <div key={band.label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-end text-xs text-muted-foreground tabular-nums">
                {band.label}
              </span>
              <div className="min-w-0 flex-1">
                <MiniBar value={band.count} max={maxBand} color={band.color} />
              </div>
              <span className="w-8 shrink-0 text-end text-xs font-medium text-foreground tabular-nums">
                {band.count}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function remainingAchievementLabel(game: Game): string {
  const remaining = Math.max(game.achievements.total - game.achievements.earned, 0);

  return `${remaining.toLocaleString()} achievement${remaining === 1 ? "" : "s"} left`;
}

function GameFocusLink({ game, detail }: { game: Game; detail: string }) {
  return (
    <li>
      <Link
        href={`/games/${game.appId}`}
        className="flex min-w-0 items-center justify-between gap-3 rounded-lg ps-2 pe-2 pbs-2 pbe-2 text-sm touch-manipulation motion-safe:transition-[background-color,transform] motion-safe:duration-150 motion-safe:ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/50 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center justify-between gap-3">
            <span className="min-w-0 truncate font-medium text-foreground">{game.name}</span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{detail}</span>
          </span>
          <Progress
            value={game.completion}
            className="gap-0"
            indicatorClassName={completionTierOf(game.completion).barClassName}
            aria-label={`${game.completion}% completion for ${game.name}`}
          />
        </span>
      </Link>
    </li>
  );
}

function AchievementPortfolioSection({ data }: { data: DashboardData }) {
  const portfolio = useMemo(() => summarizeAchievementPortfolio(data.games), [data.games]);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pbe-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <Award className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
          Achievement Portfolio
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pbs-0">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm text-muted-foreground">Weighted library completion</span>
          <span className="text-3xl font-bold text-foreground tabular-nums">
            {portfolio.completionPercent}%
          </span>
        </div>
        <Progress
          value={portfolio.completionPercent}
          className="gap-0"
          indicatorClassName="bg-primary"
          aria-label={`${portfolio.completionPercent}% weighted library completion`}
        />
        <p className="text-sm text-muted-foreground tabular-nums">
          {portfolio.earnedAchievements.toLocaleString()} earned of{" "}
          {portfolio.possibleAchievements.toLocaleString()} possible across{" "}
          {portfolio.eligibleGames} {portfolio.eligibleGames === 1 ? "game" : "games"}.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Achievements remaining</p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              {portfolio.remainingAchievements.toLocaleString()}
            </p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Perfect games</p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              {portfolio.perfectGames}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GamesNearCompletionSection({ data }: { data: DashboardData }) {
  const games = useMemo(() => selectGamesNearCompletion(data.games), [data.games]);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pbe-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <Target className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
          Closest to Perfect
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pbs-0">
        <p className="text-sm text-muted-foreground">Your shortest paths to a 100% game.</p>
        {games.length === 0 ? (
          <p className="text-sm text-muted-foreground">No incomplete achievement games to show.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {games.map((game) => (
              <GameFocusLink
                key={game.appId}
                game={game}
                detail={remainingAchievementLabel(game)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AchievementMomentumSection({ data }: { data: DashboardData }) {
  const momentum = useMemo(
    () => summarizeAchievementUnlockMomentum(data.games, Date.now()),
    [data.games],
  );

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pbe-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <CalendarClock className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
          Recent Unlocks
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pbs-0">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Last 7 days</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {momentum.last7Days.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">recorded unlocks</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Rolling 30 days</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {momentum.last30Days.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">recorded unlocks</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Counts use unlock history currently available in your cached library and may grow as Steam
          enrichment continues.
        </p>
      </CardContent>
    </Card>
  );
}

function TrackedGameHealthSection({ data }: { data: DashboardData }) {
  const health = useMemo(() => summarizeTrackedGameHealth(data.games, Date.now()), [data.games]);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pbe-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <Gamepad2 className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
          Tracked Game Health
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pbs-0">
        {health.trackedGameCount === 0 ? (
          <p className="text-sm text-muted-foreground">
            Track games in your library to see which are close to completion or have no recent
            recorded unlocks.
          </p>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] gap-4">
            <section className="flex min-w-0 flex-col gap-2">
              <h3 className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                <span>Close to perfect</span>
                <span className="text-muted-foreground tabular-nums">
                  {health.nearPerfectCount}
                </span>
              </h3>
              {health.nearPerfectGames.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No tracked games are close to perfect yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {health.nearPerfectGames.map((game) => (
                    <GameFocusLink
                      key={game.appId}
                      game={game}
                      detail={remainingAchievementLabel(game)}
                    />
                  ))}
                </ul>
              )}
            </section>
            <section className="flex min-w-0 flex-col gap-2">
              <h3 className="flex items-center justify-between gap-2 text-sm font-medium text-foreground">
                <span>No recorded unlock in 30 days</span>
                <span className="text-muted-foreground tabular-nums">
                  {health.noRecentUnlockCount}
                </span>
              </h3>
              {health.noRecentUnlockGames.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No tracked incomplete games in this group.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {health.noRecentUnlockGames.map((game) => (
                    <GameFocusLink key={game.appId} game={game} detail={`${game.completion}%`} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          This reflects recorded achievement unlocks, not playtime; cached unlock history may be
          incomplete while Steam enrichment continues.
        </p>
      </CardContent>
    </Card>
  );
}

function VelocitySection({ data }: { data: DashboardData }) {
  const { weeklyData, maxCount } = useMemo(() => {
    const allUnlocktimes = data.games.flatMap((g) => g.unlocktimes);

    if (allUnlocktimes.length === 0) return { weeklyData: [], maxCount: 0 };

    const nowSec = Date.now() / 1000;
    const weeks: { label: string; count: number }[] = [];

    for (let i = 11; i >= 0; i--) {
      const weekStart = nowSec - (i + 1) * 7 * 86400;
      const weekEnd = nowSec - i * 7 * 86400;
      const label = `-${i + 1}w`;

      const count = allUnlocktimes.filter((t) => t >= weekStart && t < weekEnd).length;

      weeks.push({ label, count });
    }

    const maxCount = Math.max(...weeks.map((w) => w.count), 1);

    return { weeklyData: weeks, maxCount };
  }, [data.games]);

  const weeklyTotal = weeklyData.reduce((s, w) => s + w.count, 0);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <TrendingUp className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
          Unlock Velocity
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 pt-0">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground tabular-nums">{weeklyTotal}</span>
          <span className="text-sm text-muted-foreground">last 12 weeks</span>
        </div>
        <div className="flex items-end gap-1 overflow-clip" style={{ height: 100 }}>
          {weeklyData.map((w) => (
            <div key={w.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-foreground tabular-nums">
                {w.count}
              </span>
              <div
                className="w-full rounded-t bg-primary transition-[height,opacity] motion-reduce:transition-none"
                style={{
                  height: `${(w.count / maxCount) * 70}px`,
                  opacity: Math.max(0.3, w.count / maxCount),
                }}
              />
              <span className="text-[9px] text-muted-foreground">{w.label.replace("w", "")}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function InsightsCards({ data }: { data: DashboardData }) {
  return (
    <div className="mbs-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-6">
      <AchievementPortfolioSection data={data} />
      <GamesNearCompletionSection data={data} />
      <AchievementMomentumSection data={data} />
      <TrackedGameHealthSection data={data} />
      <PlaytimeSection data={data} />
      <RaritySection data={data} />
      <CompletionSection data={data} />
      <VelocitySection data={data} />
    </div>
  );
}
