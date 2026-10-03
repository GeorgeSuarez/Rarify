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
    <div className="relative" style={{ width: size, height: size }}>
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
            "transition-all duration-1000 ease-out",
            tier.textClassName,
          )}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold">{value}%</span>
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
        <div className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", iconBg)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          <div className="mt-1 text-xs">{subtext}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StatsCards({ stats }: { stats: Stats }) {
  const completionValue = Math.round(stats.avgCompletion) || 0;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={<Trophy className="size-6 text-blue-400" />}
        iconBg="bg-blue-500/10"
        label="Achievements Earned"
        value={(stats.achievementsEarned || 0).toLocaleString()}
        subtext={
          stats.achievementsEarnedDelta != null ? (
            <span className={cn("flex items-center gap-1", stats.achievementsEarnedDelta >= 0 ? "text-green-400" : "text-red-400")}>
              {stats.achievementsEarnedDelta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} 
              {Math.abs(stats.achievementsEarnedDelta)} this month
            </span>
          ) : (
            <span className="text-muted-foreground">All time total</span>
          )
        }
      />

      <Card className="border-border/50 bg-card">
        <CardContent className="flex items-center gap-4 p-5">
          <CircularProgress value={completionValue} />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Avg Completion
            </p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              {stats.avgCompletion || 0}%
            </p>
            {stats.avgCompletionDelta != null ? (
              <span className={cn("mt-1 flex items-center gap-1 text-xs", stats.avgCompletionDelta >= 0 ? "text-green-400" : "text-red-400")}>
                {stats.avgCompletionDelta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />} 
                {Math.abs(stats.avgCompletionDelta)}% vs last month
              </span>
            ) : (
              <span className="mt-1 block text-xs text-muted-foreground">
                Across all tracked games
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <StatCard
        icon={<Users className="size-6 text-amber-400" />}
        iconBg="bg-amber-500/10"
        label="Games Owned"
        value={String(stats.gamesOwned || 0)}
        subtext={
          stats.gamesOwnedDelta != null ? (
            <span className="text-muted-foreground">
              <span className={cn(stats.gamesOwnedDelta >= 0 ? "text-green-400" : "text-red-400")}>
                {stats.gamesOwnedDelta >= 0 ? "+" : ""}{stats.gamesOwnedDelta}
              </span> this month
            </span>
          ) : (
            <span className="text-muted-foreground">In your library</span>
          )
        }
      />

      <StatCard
        icon={<Gamepad2 className="size-6 text-green-400" />}
        iconBg="bg-green-500/10"
        label="Games Tracked"
        value={String(stats.gamesTracked || 0)}
        subtext={
          <span className="text-green-400">{stats.perfectGames || 0} perfect games</span>
        }
      />
    </div>
  );
}
