import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Clock,
  ArrowUp,
  ArrowDown,
  Gamepad2,
  Bookmark,
  BookmarkCheck,
} from "lucide-react";
import { Image } from "@/src/spa/next-compat";
import { Link } from "@/src/spa/next-compat";
import { completionTierOf } from "@/lib/completion-tiers";
import { cn } from "@/lib/utils";
import type { Game } from "@/lib/types";

const TOP_GAMES_LIMIT = 4;

function GameHeader({ game, priority }: { game: Game; priority?: boolean }) {
  return (
    <Link
      href={`/games/${game.appId}`}
      className="flex items-center gap-4 transition-opacity hover:opacity-80"
    >
      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg">
        <Image
          src={game.image}
          alt={game.name}
          fill
          priority={priority}
          fetchPriority={priority ? "high" : undefined}
          className="object-cover"
          sizes="(max-width: 1024px) 96px, 96px"
        />
      </div>
      <div>
        <p className="font-semibold text-foreground">{game.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" /> {game.hours} hrs
        </p>
      </div>
    </Link>
  );
}

function CompletionBar({ game }: { game: Game }) {
  const tier = completionTierOf(game.completion);

  return (
    <div className="flex w-32 flex-col gap-1">
      <span className={cn("font-semibold", tier.textClassName)}>
        {game.completion}%
      </span>
      <Progress
        value={game.completion}
        indicatorClassName={tier.barClassName}
        aria-label={`${game.completion}% completion`}
      />
    </div>
  );
}

function AchievementCount({ game }: { game: Game }) {
  return (
    <div className="flex items-center gap-2 text-foreground">
      <Trophy className="size-4 text-muted-foreground" />
      <span className="font-semibold">{game.achievements.earned}</span>
      <span className="text-muted-foreground">/ {game.achievements.total}</span>
    </div>
  );
}

function Comparison({ game }: { game: Game }) {
  return (
    <p className="flex items-center gap-1.5 text-foreground">
      {game.comparison.isPositive ? (
        <ArrowUp className="size-4 text-green-400" aria-hidden />
      ) : (
        <ArrowDown className="size-4 text-red-400" aria-hidden />
      )}
      <span>
        {game.comparison.text}{" "}
        <span
          className={
            game.comparison.isPositive
              ? "font-semibold text-green-400"
              : "font-semibold text-red-400"
          }
        >
          {game.comparison.percent}%
        </span>{" "}
        <span className="text-muted-foreground">of players</span>
      </span>
    </p>
  );
}

function TrackButton({
  game,
  onTrackToggle,
}: {
  game: Game;
  onTrackToggle?: (appId: number, tracked: boolean) => void;
}) {
  const [tracked, setTracked] = useState(game.tracked);
  const [isPending, startTransition] = useTransition();

  function toggleTrack() {
    const nextTracked = !tracked;
    setTracked(nextTracked);
    startTransition(async () => {
      try {
        if (nextTracked) {
          await fetch("/api/tracked-games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId: game.appId }),
          });
        } else {
          await fetch(`/api/tracked-games?appId=${game.appId}`, {
            method: "DELETE",
          });
        }

        onTrackToggle?.(game.appId, nextTracked);
      } catch {
        setTracked(!nextTracked);
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTrack}
      disabled={isPending}
      aria-label={tracked ? `Untrack ${game.name}` : `Track ${game.name}`}
      aria-pressed={tracked}
      className={
        tracked
          ? "min-w-[92px] text-primary"
          : "min-w-[92px] text-muted-foreground hover:text-foreground"
      }
    >
      {tracked ? (
        <BookmarkCheck data-icon="inline-start" />
      ) : (
        <Bookmark data-icon="inline-start" />
      )}
      {tracked ? "Tracked" : "Track"}
    </Button>
  );
}

function TopGameTableRow({
  game,
  onTrackToggle,
  priority,
}: {
  game: Game;
  onTrackToggle?: (appId: number, tracked: boolean) => void;
  priority?: boolean;
}) {
  return (
    <TableRow key={game.appId} className="hover:bg-white/[0.02]">
      <TableCell className="py-4">
        <GameHeader game={game} priority={priority} />
      </TableCell>
      <TableCell className="py-4">
        <CompletionBar game={game} />
      </TableCell>
      <TableCell className="py-4">
        <AchievementCount game={game} />
      </TableCell>
      <TableCell className="py-4">
        <Comparison game={game} />
      </TableCell>
      <TableCell className="py-4">
        <TrackButton game={game} onTrackToggle={onTrackToggle} />
      </TableCell>
    </TableRow>
  );
}

function TopGameCard({
  game,
  onTrackToggle,
  priority,
}: {
  game: Game;
  onTrackToggle?: (appId: number, tracked: boolean) => void;
  priority?: boolean;
}) {
  return (
    <div className="py-4">
      <Separator className="mb-4" />
      <div className="flex items-start justify-between gap-3">
        <GameHeader game={game} priority={priority} />
        <TrackButton game={game} onTrackToggle={onTrackToggle} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <CompletionBar game={game} />
        <AchievementCount game={game} />
      </div>
      <div className="mt-3">
        <Comparison game={game} />
      </div>
    </div>
  );
}

export function TopGames({
  games,
  onTrackToggle,
}: {
  games: ReadonlyArray<Game>;
  onTrackToggle?: (appId: number, tracked: boolean) => void;
}) {
  const topGames = [...games].sort((a, b) => b.hours - a.hours).slice(0, TOP_GAMES_LIMIT);

  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">Top Games</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {topGames.length === 0 ? (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Gamepad2 />
              </EmptyMedia>
              <EmptyTitle>No games to show</EmptyTitle>
              <EmptyDescription>
                Try changing the filter to see more games.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="hidden lg:block">
              <Table>
                <TableCaption className="sr-only">
                  Top games by playtime with completion, achievements, and community
                  comparison
                </TableCaption>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Game</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Achievements</TableHead>
                    <TableHead>Compare</TableHead>
                    <TableHead>Track</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topGames.map((game, index) => (
                    <TopGameTableRow
                      key={game.appId}
                      game={game}
                      onTrackToggle={onTrackToggle}
                      priority={index < 2}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="lg:hidden">
              {topGames.map((game, index) => (
                <TopGameCard
                  key={game.appId}
                  game={game}
                  onTrackToggle={onTrackToggle}
                  priority={index < 2}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
