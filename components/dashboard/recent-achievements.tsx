import { Link } from "@/src/spa/next-compat";
import { Trophy } from "lucide-react";
import { Image } from "@/src/spa/next-compat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { timeAgo } from "@/src/domain/dashboard-calculations";
import type { RecentAchievement } from "@/lib/types";

/**
 * Latest unlocks as a vertical timeline: icon rail on the inline-start side,
 * achievement + game names in the middle, relative unlock time at the end.
 * Times stay tabular so the rail never shifts as values tick over.
 */
export function RecentAchievements({
  achievements,
}: {
  achievements: ReadonlyArray<RecentAchievement>;
}) {
  const latest = achievements.slice(0, 5);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pbe-2">
        <CardTitle className="text-base font-semibold">Latest unlocks</CardTitle>
        {latest.length > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums">
            {latest.length} shown
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pbs-2">
        {latest.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Trophy />
              </EmptyMedia>
              <EmptyTitle>No recent achievements</EmptyTitle>
              <EmptyDescription>Achievements you earn will appear here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="flex flex-col">
            {latest.map((ach, i) => (
              <li
                key={`${ach.appId}-${ach.name}-${i}`}
                className="relative flex items-start gap-4 pbs-3 pbe-3"
              >
                {i < latest.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute inset-bs-12 bs-[calc(100%-1.5rem)] w-px bg-border/60 [inset-inline-start:1.25rem]"
                  />
                )}
                <div className="relative aspect-square size-10 shrink-0 grow-0 overflow-clip rounded-lg bg-muted outline-1 outline-offset-[-1px] outline-foreground/10">
                  {ach.icon ? (
                    <Image
                      src={ach.icon}
                      alt=""
                      fill
                      className="h-full w-full object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Trophy className="size-5 shrink-0 text-muted-foreground" aria-hidden />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate font-semibold text-foreground">{ach.name}</p>
                  <Link
                    href={`/games/${ach.appId}`}
                    className="w-fit max-w-full truncate text-xs text-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {ach.gameName}
                  </Link>
                  {ach.description && (
                    <p className="line-clamp-1 text-xs text-muted-foreground/70">
                      {ach.description}
                    </p>
                  )}
                </div>
                <Tooltip>
                  <TooltipTrigger className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {timeAgo(ach.unlocktime)}
                  </TooltipTrigger>
                  <TooltipContent>
                    {new Date(ach.unlocktime * 1000).toLocaleString()}
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
