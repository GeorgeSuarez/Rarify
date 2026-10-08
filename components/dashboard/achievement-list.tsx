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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
      className={cn("flex items-start gap-4 pbs-4 pbe-4", !achievement.achieved && "opacity-60")}
    >
      <div className="relative size-12 shrink-0 overflow-clip rounded-lg bg-muted outline-1 outline-offset-[-1px] outline-foreground/10">
        {achievement.achieved && achievement.icon ? (
          <Image
            src={achievement.icon}
            alt=""
            fill
            className="h-full w-full object-cover"
            sizes="48px"
          />
        ) : achievement.icongray ? (
          <Image
            src={achievement.icongray}
            alt=""
            fill
            className="h-full w-full object-cover grayscale"
            sizes="48px"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Trophy className="size-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground wrap-break-word">{achievement.name}</p>
        {achievement.description && (
          <p className="text-xs text-muted-foreground wrap-break-word">{achievement.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-[0.5em]">
            {achievement.achieved ? (
              <Unlock className="size-[1cap] shrink-0 text-green-400" aria-hidden />
            ) : (
              <Lock className="size-[1cap] shrink-0 text-muted-foreground" aria-hidden />
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
          <Badge variant="secondary" className="text-xs tabular-nums">
            {achievement.globalPercent.toFixed(1)}% of players
          </Badge>
        </div>
      </div>
      {achievement.achieved && (
        <div className="shrink-0">
          <div className="flex size-8 items-center justify-center rounded-full bg-green-500/20">
            <Trophy className="size-4 text-green-400" aria-hidden />
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
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          {/* Back link */}
          <Link
            href="/games"
            className="inline-flex w-fit touch-manipulation items-center gap-[0.5em] text-sm text-muted-foreground motion-safe:transition-[color,transform] motion-safe:duration-150 motion-safe:ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <ArrowLeft className="size-[1.2cap] shrink-0" aria-hidden />
            Back to games
          </Link>

          {/* Game header */}
          <div className="relative grid aspect-[460/215] w-full grid-cols-1 grid-rows-1 overflow-clip rounded-xl bg-muted">
            <Image
              src={data.gameImage}
              alt=""
              fill
              className="h-full w-full object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 896px"
            />
            <div
              className="col-start-1 row-start-1 bg-linear-to-t from-background via-background/30 to-transparent"
              aria-hidden
            />
            <div className="col-start-1 row-start-1 flex min-w-0 flex-col gap-2 self-end justify-self-stretch ps-4 pe-4 pbs-4 pbe-4 sm:ps-6 sm:pe-6 sm:pbs-6 sm:pbe-6">
              <h1 className="text-[clamp(1.25rem,1rem_+_1.5vw,1.5rem)] font-bold leading-tight text-foreground text-balance wrap-break-word">
                {data.gameName}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground/80 tabular-nums">
                <span className="flex items-center gap-[0.5em]">
                  <Clock className="size-[1cap] shrink-0" aria-hidden />
                  {data.hours}h played
                </span>
                <span className="flex items-center gap-[0.5em]">
                  <Trophy className="size-[1cap] shrink-0" aria-hidden />
                  {data.earnedAchievements}/{data.totalAchievements}
                </span>
                <span
                  className={cn("font-semibold", completionTierOf(data.completion).textClassName)}
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
              <CardHeader className="pbe-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {achievements.length} Achievement
                    {achievements.length !== 1 ? "s" : ""}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs tabular-nums">
                    {earned.length} unlocked &middot; {locked.length} locked
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 pbs-4">
                {earned.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-green-400 tabular-nums">
                      Unlocked ({earned.length})
                    </h3>
                    <div className="flex flex-col">
                      {earned.map((ach, index) => (
                        <div key={ach.apiname} className="flex flex-col">
                          {index !== 0 && <Separator />}
                          <AchievementRow achievement={ach} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {locked.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground tabular-nums">
                      Locked ({locked.length})
                    </h3>
                    <div className="flex flex-col">
                      {locked.map((ach, index) => (
                        <div key={ach.apiname} className="flex flex-col">
                          {index !== 0 && <Separator />}
                          <AchievementRow achievement={ach} />
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
