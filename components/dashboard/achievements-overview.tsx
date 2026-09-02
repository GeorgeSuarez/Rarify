"use client";

import Image from "next/image";
import Link from "next/link";
import { Trophy, Award, Gamepad2, AlertTriangle, EyeOff } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AchievementsOverviewData } from "@/lib/dashboard";

function timeAgo(unix: number): string {
  if (unix === 0) return "";
  const diff = Date.now() - unix * 1000;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AchievementRow({
  achievement,
  showGame = true,
  showPercent = false,
}: {
  achievement: AchievementsOverviewData["recentAchievements"][number];
  showGame?: boolean;
  showPercent?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 py-3 transition-colors hover:bg-white/[0.02]">
      <Separator orientation="horizontal" className="sr-only" />
      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
        {achievement.icon ? (
          <Image
            src={achievement.icon}
            alt={achievement.name}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Trophy className="size-5 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{achievement.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {showGame && achievement.gameName}
          {showGame && showPercent && achievement.globalPercent != null && " · "}
          {showPercent && achievement.globalPercent != null && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {achievement.globalPercent.toFixed(1)}% of players
            </Badge>
          )}
          {!showGame && achievement.globalPercent != null && (
            <Badge variant="secondary" className="text-[10px]">
              {achievement.globalPercent.toFixed(1)}% of players
            </Badge>
          )}
        </p>
        {achievement.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">{achievement.description}</p>
        )}
      </div>
      {achievement.unlocktime > 0 && (
        <Tooltip>
          <TooltipTrigger className="shrink-0 text-xs text-muted-foreground">
            {timeAgo(achievement.unlocktime)}
          </TooltipTrigger>
          <TooltipContent>{new Date(achievement.unlocktime * 1000).toLocaleString()}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function AchievementsOverview({ data }: { data: AchievementsOverviewData }) {
  const { stats, games, recentAchievements, rarestAchievements, rarestPerGame } = data;

  const gamesWithAch = games.filter((g) => g.achievements.total > 0);
  const completedGames = gamesWithAch.filter((g) => g.achievements.earned >= g.achievements.total);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar user={data.user} activeHref="/achievements" />
      <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Mobile top bar */}
          <div className="-mx-4 mb-4 flex items-center gap-3 lg:hidden">
            <MobileSidebar user={data.user} activeHref="/achievements" />
            <h2 className="text-xl font-bold text-foreground">Achievements</h2>
          </div>

          {/* Header */}
          <div className="pb-6">
            <h2 className="hidden text-2xl font-bold text-foreground lg:block">
              Achievements
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.achievementsEarned.toLocaleString()} earned across {gamesWithAch.length} game{gamesWithAch.length !== 1 ? "s" : ""}
            </p>
          </div>

          {data.error ? (
            <Alert variant="destructive" className="flex flex-col items-center gap-3 py-8 text-center">
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
              {/* Stats cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Earned" value={stats.achievementsEarned.toLocaleString()} sub={stats.achievementsEarnedDelta != null ? `+${stats.achievementsEarnedDelta} this month` : undefined} />
                <StatCard label="Avg Completion" value={`${stats.avgCompletion}%`} />
                <StatCard label="Perfect Games" value={completedGames.length} sub={completedGames.length === 1 ? "100% complete" : undefined} />
                <StatCard label="Games with Achievements" value={gamesWithAch.length} />
              </div>

              {/* Recent and Rarest */}
              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="border-border/50 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      Recently Unlocked
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col pt-0">
                    {recentAchievements.length === 0 ? (
                      <Empty className="py-8">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Trophy />
                          </EmptyMedia>
                          <EmptyTitle>No achievements unlocked yet</EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      recentAchievements.map((ach, i) => (
                        <div key={`recent-${ach.appId}-${ach.name}-${i}`} className="flex flex-col">
                          {i !== 0 && <Separator />}
                          <AchievementRow achievement={ach} showPercent />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-card">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      Rarest Gems
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col pt-0">
                    {rarestAchievements.length === 0 ? (
                      <Empty className="py-8">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Award />
                          </EmptyMedia>
                          <EmptyTitle>No rare achievements yet</EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    ) : (
                      rarestAchievements.map((ach, i) => (
                        <div key={`rare-${ach.appId}-${ach.name}-${i}`} className="flex flex-col">
                          {i !== 0 && <Separator />}
                          <AchievementRow achievement={ach} showPercent />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Game-by-game table */}
              <Card className="mt-6 border-border/50 bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">
                    Achievement Progress by Game
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {gamesWithAch.length === 0 ? (
                    <Empty className="py-8">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Gamepad2 />
                        </EmptyMedia>
                        <EmptyTitle>No games with achievements</EmptyTitle>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Game</TableHead>
                          <TableHead>Achievements</TableHead>
                          <TableHead>Completion</TableHead>
                          <TableHead>Rarest</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gamesWithAch.sort((a, b) => b.hours - a.hours).map((game) => {
                          const rarest = rarestPerGame.find((r) => r.appId === game.appId);
                          return (
                            <TableRow key={game.appId} className="hover:bg-white/[0.02]">
                              <TableCell className="py-3 pr-4">
                                <Link href={`/games/${game.appId}`} className="flex items-center gap-3">
                                  <div className="relative h-10 w-16 shrink-0 overflow-hidden rounded-lg">
                                    <Image
                                      src={game.image}
                                      alt={game.name}
                                      fill
                                      className="object-cover"
                                      sizes="64px"
                                    />
                                  </div>
                                  <span className="truncate font-medium text-foreground hover:text-primary">
                                    {game.name}
                                  </span>
                                </Link>
                              </TableCell>
                              <TableCell className="py-3 pr-4">
                                <span className="flex items-center gap-1.5">
                                  <Trophy className="size-3.5 text-muted-foreground" />
                                  <span className="font-semibold text-foreground">{game.achievements.earned}</span>
                                  <span className="text-muted-foreground">/ {game.achievements.total}</span>
                                </span>
                              </TableCell>
                              <TableCell className="py-3 pr-4">
                                <div className="flex items-center gap-3">
                                  <span className="w-10 text-right font-semibold text-foreground">{game.completion}%</span>
                                  <Progress value={game.completion} className="w-20" />
                                </div>
                              </TableCell>
                              <TableCell className="py-3">
                                {rarest ? (
                                  <div className="flex items-center gap-2">
                                    <div className="relative size-6 shrink-0 overflow-hidden rounded bg-muted">
                                      {rarest.achievement.icon ? (
                                        <Image
                                          src={rarest.achievement.icon}
                                          alt={rarest.achievement.name}
                                          fill
                                          className="object-cover"
                                          sizes="24px"
                                        />
                                      ) : (
                                        <Award className="size-3.5 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="truncate text-xs text-foreground">{rarest.achievement.name}</p>
                                      <Badge variant="secondary" className="text-[10px]">
                                        {rarest.achievement.globalPercent?.toFixed(1)}% of players
                                      </Badge>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
