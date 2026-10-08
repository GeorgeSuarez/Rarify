import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Gamepad2, TrendingUp, TrendingDown } from "lucide-react";
import { completionTierOf } from "@/lib/completion-tiers";
import { cn } from "@/lib/utils";
import type { Stats } from "@/lib/types";

function CircularProgress({
  value,
  size = 56,
  strokeWidth = 6,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
}) {
  const tier = completionTierOf(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        role="img"
        aria-label={`Average completion ${value}%`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-300 motion-safe:ease-out",
            tier.textClassName,
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold tabular-nums">{value}%</span>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  subtext: React.ReactNode;
}

function StatCard({ icon, iconBg, label, value, subtext }: StatCardProps) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-lg", iconBg)}>
          {icon}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          <div className="mt-auto pt-1 text-xs">{subtext}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: Stats }) {
  const completionValue = Math.round(stats.avgCompletion) || 0;

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
      <StatCard
        icon={<Trophy className="size-6 shrink-0 text-blue-400" />}
        iconBg="bg-blue-500/10"
        label="Achievements Earned"
        value={(stats.achievementsEarned || 0).toLocaleString()}
        subtext={
          stats.achievementsEarnedDelta != null ? (
            <span
              className={cn(
                "flex items-center gap-[0.35em] tabular-nums",
                stats.achievementsEarnedDelta >= 0 ? "text-green-400" : "text-red-400",
              )}
            >
              {stats.achievementsEarnedDelta >= 0 ? (
                <TrendingUp className="size-[1cap] shrink-0" aria-hidden />
              ) : (
                <TrendingDown className="size-[1cap] shrink-0" aria-hidden />
              )}
              {Math.abs(stats.achievementsEarnedDelta)} in the last 30 days
            </span>
          ) : (
            <span className="text-muted-foreground">All time total</span>
          )
        }
      />

      <Card className="border-border/50 bg-card">
        <CardContent className="flex items-center gap-4 p-5">
          <CircularProgress value={completionValue} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Avg Completion
            </p>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {stats.avgCompletion || 0}%
            </p>
            {stats.avgCompletionDelta != null ? (
              <span
                className={cn(
                  "mt-auto flex items-center gap-[0.35em] pt-1 text-xs tabular-nums",
                  stats.avgCompletionDelta >= 0 ? "text-green-400" : "text-red-400",
                )}
              >
                {stats.avgCompletionDelta >= 0 ? (
                  <TrendingUp className="size-[1cap] shrink-0" aria-hidden />
                ) : (
                  <TrendingDown className="size-[1cap] shrink-0" aria-hidden />
                )}
                {Math.abs(stats.avgCompletionDelta)}% since last snapshot
              </span>
            ) : (
              <span className="mt-auto block pt-1 text-xs text-muted-foreground">
                Across all tracked games
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <StatCard
        icon={<Users className="size-6 shrink-0 text-amber-400" />}
        iconBg="bg-amber-500/10"
        label="Games Owned"
        value={String(stats.gamesOwned || 0)}
        subtext={
          stats.gamesOwnedDelta != null ? (
            <span className="text-muted-foreground tabular-nums">
              <span className={cn(stats.gamesOwnedDelta >= 0 ? "text-green-400" : "text-red-400")}>
                {stats.gamesOwnedDelta >= 0 ? "+" : ""}
                {stats.gamesOwnedDelta}
              </span>{" "}
              since last snapshot
            </span>
          ) : (
            <span className="text-muted-foreground">In your library</span>
          )
        }
      />

      <StatCard
        icon={<Gamepad2 className="size-6 shrink-0 text-green-400" />}
        iconBg="bg-green-500/10"
        label="Games Tracked"
        value={String(stats.gamesTracked || 0)}
        subtext={
          <span className="text-green-400 tabular-nums">
            {stats.perfectGames || 0} perfect games
          </span>
        }
      />
    </div>
  );
}
