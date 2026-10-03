"use client";

import { Image } from "@/src/spa/next-compat";
import { Link } from "@/src/spa/next-compat";
import { ArrowLeft, Clock, Trophy, Lock, Unlock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { completionTierOf } from "@/lib/completion-tiers";
import { cn } from "@/lib/utils";
import type { GameAchievements } from "@/src/domain/dashboard";

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

function AchievementRow({
  achievement,
}: {
  achievement: GameAchievements["achievements"][number];
}) {
  return (
    <div
      className={
        "flex items-center gap-4 py-4 transition-colors hover:bg-white/[0.02]" +
        (achievement.achieved ? "" : " opacity-60")
      }
    >
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {achievement.achieved && achievement.icon ? (
          <Image
            src={achievement.icon}
            alt={achievement.name}
            fill
            className="object-cover"
            sizes="48px"
          />
        ) : achievement.icongray ? (
          <Image
            src={achievement.icongray}
            alt={achievement.name}
            fill
            className="object-cover grayscale"
            sizes="48px"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Trophy className="size-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">
          {achievement.name}
        </p>
        {achievement.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {achievement.description}
          </p>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            {achievement.achieved ? (
              <Unlock className="size-3 text-green-400" />
            ) : (
              <Lock className="size-3 text-muted-foreground" />
            )}
            {achievement.achieved ? "Unlocked" : "Locked"}
          </span>
          {achievement.achieved && achievement.unlocktime > 0 && (
            <Tooltip>
              <TooltipTrigger>{timeAgo(achievement.unlocktime)}</TooltipTrigger>
              <TooltipContent>
                {new Date(achievement.unlocktime * 1000).toLocaleString()}
              </TooltipContent>
            </Tooltip>
          )}
          <Badge variant="secondary" className="text-[10px]">
            {achievement.globalPercent.toFixed(1)}% of players
          </Badge>
        </div>
      </div>
      {achievement.achieved && (
        <div className="shrink-0">
          <div className="flex size-8 items-center justify-center rounded-full bg-green-500/20">
            <Trophy className="size-4 text-green-400" />
          </div>
        </div>
      )}
    </div>
  );
}

export function AchievementList({ data }: { data: GameAchievements }) {
  const { achievements } = data;

  const earned = achievements.filter((a) => a.achieved);
  const locked = achievements.filter((a) => !a.achieved);

  return (
    <div className="flex min-h-screen w-full">
      <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Back link */}
          <Link
            href="/games"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to games
          </Link>

          {/* Game header */}
          <div className="relative mb-6 overflow-hidden rounded-xl">
            <div className="relative aspect-460/215 w-full">
              <Image
                src={data.gameImage}
                alt={data.gameName}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 896px"
              />
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/30 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                {data.gameName}
              </h1>
              <div className="mt-2 flex items-center gap-4 text-sm text-white/80">
                <span className="flex items-center gap-1">
                  <Clock className="size-4" />
                  {data.hours}h played
                </span>
                <span className="flex items-center gap-1">
                  <Trophy className="size-4" />
                  {data.earnedAchievements}/{data.totalAchievements}
                </span>
                <span
                  className={cn(
                    "font-semibold",
                    completionTierOf(data.completion).textClassName,
                  )}
                >
                  {data.completion}%
                </span>
              </div>
            </div>
          </div>

          {achievements.length === 0 ? (
            <Card className="border-border/50 bg-card">
              <CardContent className="p-0">
                <Empty className="py-12">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Trophy />
                    </EmptyMedia>
                    <EmptyTitle>No achievement data</EmptyTitle>
                    <EmptyDescription>
                      No achievement data available for this game.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {achievements.length} Achievement
                    {achievements.length !== 1 ? "s" : ""}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {earned.length} unlocked &middot; {locked.length} locked
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col">
                {earned.length > 0 && (
                  <>
                    <h3 className="mb-2 mt-4 text-sm font-medium text-green-400">
                      Unlocked ({earned.length})
                    </h3>
                    {earned.map((ach, index) => (
                      <div key={ach.apiname} className="flex flex-col">
                        {index !== 0 && <Separator />}
                        <AchievementRow achievement={ach} />
                      </div>
                    ))}
                  </>
                )}
                {locked.length > 0 && (
                  <>
                    <h3 className="mb-2 mt-6 text-sm font-medium text-muted-foreground">
                      Locked ({locked.length})
                    </h3>
                    {locked.map((ach, index) => (
                      <div key={ach.apiname} className="flex flex-col">
                        {index !== 0 && <Separator />}
                        <AchievementRow achievement={ach} />
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
