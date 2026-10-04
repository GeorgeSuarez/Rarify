import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Trophy } from "lucide-react";
import { Image } from "@/src/spa/next-compat";
import type { RecentAchievement } from "@/lib/types";

function timeAgo(unix: number): string {
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

export function RecentAchievements({
  achievements,
}: {
  achievements: ReadonlyArray<RecentAchievement>;
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Recent Achievements
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {achievements.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Trophy />
              </EmptyMedia>
              <EmptyTitle>No recent achievements</EmptyTitle>
              <EmptyDescription>
                Achievements you earn will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ul className="flex flex-col">
            {achievements.map((ach, i) => (
              <li
                key={`${ach.appId}-${ach.name}-${i}`}
                className="flex items-center gap-4 py-3"
              >
                <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {ach.icon ? (
                    <Image
                      src={ach.icon}
                      alt={ach.name}
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
                  <p className="truncate font-semibold text-foreground">
                    {ach.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ach.gameName}
                  </p>
                  {ach.description && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/70">
                      {ach.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                  <Tooltip>
                    <TooltipTrigger className="text-xs text-muted-foreground">
                      {timeAgo(ach.unlocktime)}
                    </TooltipTrigger>
                    <TooltipContent>
                      {new Date(ach.unlocktime * 1000).toLocaleString()}
                    </TooltipContent>
                  </Tooltip>
                  {ach.globalPercent != null && (
                    <Badge variant="secondary" className="text-[10px]">
                      {ach.globalPercent.toFixed(1)}% of players
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
