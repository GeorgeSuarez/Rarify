"use client";

import { useState, useTransition } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { RecentAchievements } from "@/components/dashboard/recent-achievements";
import { RarestAchievements } from "@/components/dashboard/rarest-achievements";
import { TrackedGamesList } from "@/components/dashboard/tracked-games-list";
import { TopGames } from "@/components/dashboard/top-games";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, AlertTriangle, EyeOff } from "lucide-react";
import type { DashboardData, GameFilter } from "@/lib/types";

export function DashboardView({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [filter, setFilter] = useState<GameFilter>("all");
  const [isPending, startTransition] = useTransition();

  function refetch(nextFilter: GameFilter) {
    startTransition(async () => {
      const params = new URLSearchParams({
        filter: nextFilter,
      });
      try {
        const res = await fetch(`/api/dashboard?${params.toString()}`);
        if (!res.ok) return;
        // SAFETY: /api/dashboard serializes our own DashboardData shape.
        const next = (await res.json()) as DashboardData;
        setData(next);
      } catch {
        // keep last good data on error
      }
    });
  }

  function onFilterChange(value: GameFilter | null) {
    if (!value) return;
    setFilter(value);
    refetch(value);
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar user={data.user} activeHref="/" />
      <main
        className="flex-1 overflow-auto bg-background p-4 lg:p-8"
        aria-busy={isPending}
      >
        <div className="mx-auto max-w-7xl">
          {/* Mobile top bar */}
          <div className="-mx-4 mb-4 flex items-center gap-3 lg:hidden">
            <MobileSidebar user={data.user} activeHref="/" />
            <h2 className="text-xl font-bold text-foreground">Overview</h2>
          </div>

          {/* Header */}
          <div className="flex flex-col justify-between gap-4 pb-6 sm:flex-row sm:items-start">
            <div>
              <h2
                className="hidden text-2xl font-bold text-foreground lg:block"
                aria-hidden
              >
                Overview
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Track your achievements and compare your progress with other
                players.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Select onValueChange={onFilterChange}>
                <SelectTrigger className="h-9 w-36 border-border/50 bg-card text-xs">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Games</SelectItem>
                    <SelectItem value="owned">Owned Games</SelectItem>
                    <SelectItem value="tracked">Tracked Games</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notification banner */}
          <Alert className="mb-6 border-primary/20 bg-primary/10">
            <Lightbulb />
            <AlertTitle>
              {data.stats.achievementsEarnedDelta != null &&
              data.stats.achievementsEarnedDelta > 0
                ? `Great job! You've earned ${data.stats.achievementsEarnedDelta} more achievements this month.`
                : `You've earned ${data.stats.achievementsEarned.toLocaleString()} achievements total.`}
            </AlertTitle>
            <AlertDescription>
              Keep playing to beat your community average!
            </AlertDescription>
          </Alert>

          {/* Dashboard content */}
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
                  : `Steam API returned status ${data.error.status ?? "(network error)"}. Ensure your STEAM_API_KEY is correct and set in Vercel env vars for Production.`}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="relative">
              {isPending && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
                  <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
                    <svg
                      className="h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating data...
                  </div>
                </div>
              )}
              <div
                className={
                  isPending
                    ? "pointer-events-none opacity-50"
                    : "transition-opacity duration-200"
                }
              >
                <StatsCards stats={data.stats} />

                {/* Top games */}
                <div className="mt-6">
                  <TopGames
                    games={data.games}
                    onTrackToggle={() => refetch(filter)}
                  />
                </div>

                {/* Tracked games */}
                <div className="mt-6">
                  <TrackedGamesList games={data.games} />
                </div>

                {/* Recent achievements */}
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <RecentAchievements achievements={data.recentAchievements} />
                  <RarestAchievements achievements={data.rarestAchievements} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
