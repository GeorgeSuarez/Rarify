import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Gamepad2, Trophy, TrendingUp } from "lucide-react";
import { completionTierOf } from "@/lib/completion-tiers";
import type { DashboardData } from "@/lib/types";

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
  const { tiers, totalEarned } = useMemo(() => {
    const tiers = data.rarityDistribution;
    const totalEarned = tiers.reduce((s, t) => t.count, 0);

    return { tiers, totalEarned };
  }, [data.rarityDistribution]);

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
  const { bands, maxBand } = useMemo(() => {
    const games = data.games.filter((g) => g.achievements.total > 0);

    const bandDefs = [
      { label: "0%", min: 0, max: 0 },
      { label: "1-25%", min: 1, max: 25 },
      { label: "25-50%", min: 25, max: 50 },
      { label: "50-75%", min: 50, max: 75 },
      { label: "75-99%", min: 75, max: 100 },
      { label: "100%", min: 100, max: 100 },
    ];

    const bands = bandDefs.map((b) => ({
      ...b,
      count: games.filter((g) => g.completion >= b.min && g.completion < b.max).length,
    }));

    const maxBand = Math.max(...bands.map((b) => b.count), 1);

    return { bands, maxBand };
  }, [data.games]);

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
          {bands.map((b) => (
            <div key={b.label} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-end text-xs text-muted-foreground tabular-nums">
                {b.label}
              </span>
              <div className="min-w-0 flex-1">
                <MiniBar value={b.count} max={maxBand} color={completionTierOf(b.min).color} />
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

const RENDER_NOW = Date.now();

function VelocitySection({ data }: { data: DashboardData }) {
  const { weeklyData, maxCount } = useMemo(() => {
    const allUnlocktimes = data.games.flatMap((g) => g.unlocktimes);

    if (allUnlocktimes.length === 0) return { weeklyData: [], maxCount: 0 };

    const nowSec = RENDER_NOW / 1000;
    const weeks: { label: string; count: number }[] = [];

    for (let i = 12; i >= 0; i--) {
      const weekStart = nowSec - (i + 1) * 7 * 86400;
      const weekEnd = nowSec - i * 7 * 86400;
      const label = `-${i}w`;

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
    <div className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-6">
      <PlaytimeSection data={data} />
      <RaritySection data={data} />
      <CompletionSection data={data} />
      <VelocitySection data={data} />
    </div>
  );
}
