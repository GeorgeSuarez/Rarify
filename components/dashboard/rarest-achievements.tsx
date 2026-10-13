import { Link } from "@/src/spa/next-compat";
import { Award, Medal } from "lucide-react";
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
import { Match } from "effect";
import { rarityLabelOf, timeAgo, type RarityLabel } from "@/src/domain/dashboard-calculations";
import { cn } from "@/lib/utils";
import type { RecentAchievement } from "@/lib/types";

const RARITY_TONE = {
  "Ultra Rare": "bg-amber-500/10 text-amber-300 ring-amber-500/30",
  "Very Rare": "bg-purple-500/10 text-purple-300 ring-purple-500/30",
  Rare: "bg-blue-500/10 text-blue-300 ring-blue-500/30",
  Uncommon: "bg-green-500/10 text-green-300 ring-green-500/30",
  Common: "bg-muted text-muted-foreground ring-foreground/10",
} satisfies Record<RarityLabel, string>;

/**
 * Rarest unlocks as trophy medals: rank number stacked over the icon,
 * rarity-tier badge derived from the global unlock percentage, and the
 * source game linked for context. Top three render as podium medals.
 */
export function RarestAchievements({
  achievements,
}: {
  achievements: ReadonlyArray<RecentAchievement>;
}) {
  const rarest = achievements.slice(0, 5);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pbe-2">
        <CardTitle className="flex items-center gap-[0.5em] text-base font-semibold">
          <Medal className="size-[1.2cap] shrink-0 text-amber-300" aria-hidden />
          Rarest trophies
        </CardTitle>
        {rarest.length > 0 && (
          <Badge variant="secondary" className="text-xs tabular-nums">
            Top {rarest.length}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pbs-2">
        {rarest.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Award />
              </EmptyMedia>
              <EmptyTitle>No rare achievements yet</EmptyTitle>
              <EmptyDescription>Unlock achievements that few players have earned.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="flex flex-col">
            {rarest.map((ach, i) => {
              const label = rarityLabelOf(ach.globalPercent ?? 100);

              const rankClassName = Match.value(i).pipe(
                Match.when(0, () => "text-amber-300"),
                Match.when(1, () => "text-slate-300"),
                Match.when(2, () => "text-orange-400"),
                Match.orElse(() => "text-muted-foreground/60"),
              );

              return (
                <li
                  key={`${ach.appId}-${ach.name}-${i}`}
                  className="flex items-center gap-4 pbs-3 pbe-3"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "w-6 shrink-0 text-center text-sm font-bold tabular-nums",
                      rankClassName,
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="relative aspect-square size-11 shrink-0 grow-0 overflow-clip rounded-full bg-muted outline-1 outline-offset-[-1px] outline-foreground/10">
                    {ach.icon ? (
                      <Image
                        src={ach.icon}
                        alt=""
                        fill
                        className="h-full w-full object-cover"
                        sizes="44px"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Award className="size-5 shrink-0 text-muted-foreground" aria-hidden />
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
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[10px] tabular-nums ring-1 ring-inset",
                        RARITY_TONE[label],
                      )}
                    >
                      {ach.globalPercent != null
                        ? `${ach.globalPercent.toFixed(1)}% · ${label}`
                        : label}
                    </Badge>
                    {ach.unlocktime > 0 && (
                      <Tooltip>
                        <TooltipTrigger className="text-[10px] text-muted-foreground/60 tabular-nums">
                          {timeAgo(ach.unlocktime)}
                        </TooltipTrigger>
                        <TooltipContent>
                          {new Date(ach.unlocktime * 1000).toLocaleString()}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
