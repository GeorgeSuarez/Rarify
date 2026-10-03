"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Trophy, Clock, BookmarkCheck } from "lucide-react";
import { Image } from "@/src/spa/next-compat";
import { Link } from "@/src/spa/next-compat";
import type { Game } from "@/lib/types";

export function TrackedGamesList({ games }: { games: ReadonlyArray<Game> }) {
  const tracked = useMemo(
    () =>
      [...games]
        .filter((g) => g.tracked)
        .sort((a, b) => b.hours - a.hours),
    [games],
  );

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Tracked Games
        </CardTitle>
        <span className="text-xs text-muted-foreground">
          {tracked.length} game{tracked.length !== 1 ? "s" : ""}
        </span>
      </CardHeader>
      <CardContent className="flex flex-col pt-2">
        {tracked.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BookmarkCheck />
              </EmptyMedia>
              <EmptyTitle>No tracked games</EmptyTitle>
              <EmptyDescription>
                Track games from the Top Games section to see them here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex flex-col">
            {tracked.map((game, index) => (
              <div key={game.appId} className="flex flex-col">
                {index !== 0 && <Separator />}
                <Link
                  href={`/games/${game.appId}`}
                  className="block py-3 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-4 px-4">
                    <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={game.image}
                        alt={game.name}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">
                        {game.name}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {game.hours}h
                        </span>
                        <span className="flex items-center gap-1">
                          <Trophy className="size-3" />
                          {game.achievements.earned}/{game.achievements.total}
                        </span>
                        <span className="ml-auto font-semibold text-foreground">
                          {game.completion}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 px-4">
                    <Progress value={game.completion} aria-label={`${game.completion}% completion`} />
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
