import { useState, useMemo, useTransition } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Button } from "@/components/ui/button";
import { Image } from "@/src/spa/next-compat";
import { Link } from "@/src/spa/next-compat";
import { Search, Clock, Trophy, Bookmark, BookmarkCheck, Gamepad2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { completionTierOf } from "@/lib/completion-tiers";
import { cn } from "@/lib/utils";
import type { Game } from "@/lib/types";

const SORT_KEYS = ["playtime", "completion", "achievements", "name"] as const;

type SortKey = (typeof SORT_KEYS)[number];

function CompletionRing({
  value,
  size = 40,
  strokeWidth = 4,
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
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        role="img"
        aria-label={`${value}% completion`}
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
          className={cn("transition-all duration-500 ease-out", tier.textClassName)}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-[10px] font-semibold tabular-nums", tier.textClassName)}>
          {value}%
        </span>
      </div>
    </div>
  );
}

function GameCard({ game: initialGame }: { game: Game }) {
  const [tracked, setTracked] = useState(initialGame.tracked);
  const [isPending, startTransition] = useTransition();

  function toggleTrack(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nextTracked = !tracked;
    setTracked(nextTracked);
    startTransition(async () => {
      try {
        if (nextTracked) {
          await fetch("/api/tracked-games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId: initialGame.appId }),
          });
        } else {
          await fetch(`/api/tracked-games?appId=${initialGame.appId}`, {
            method: "DELETE",
          });
        }
      } catch {
        setTracked(!nextTracked);
      }
    });
  }

  return (
    <div className="group relative block overflow-hidden rounded-xl border border-border/50 bg-card transition-colors hover:border-border">
      <Link href={`/games/${initialGame.appId}`} className="block">
        <div className="relative aspect-[460/215] w-full overflow-hidden">
          <Image
            src={initialGame.image}
            alt={initialGame.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
        </div>
      </Link>
      <div className="absolute top-2 right-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTrack}
          disabled={isPending}
          aria-label={tracked ? `Untrack ${initialGame.name}` : `Track ${initialGame.name}`}
          aria-pressed={tracked}
          className="size-8 rounded-full bg-background/60 backdrop-blur-sm hover:bg-background/80"
        >
          {tracked ? (
            <BookmarkCheck data-icon="inline-end" className="fill-primary text-primary" />
          ) : (
            <Bookmark data-icon="inline-end" className="text-foreground" />
          )}
        </Button>
      </div>
      <Link href={`/games/${initialGame.appId}`} className="block p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground">{initialGame.name}</h3>
            <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {initialGame.hours}h
              </span>
              {initialGame.achievements.total > 0 && (
                <span className="flex items-center gap-1">
                  <Trophy className="size-3" />
                  {initialGame.achievements.earned}/{initialGame.achievements.total}
                </span>
              )}
            </div>
          </div>
          {initialGame.achievements.total > 0 && <CompletionRing value={initialGame.completion} />}
        </div>
        {initialGame.achievements.total > 0 && (
          <div className="mt-3">
            <Progress
              value={initialGame.completion}
              indicatorClassName={completionTierOf(initialGame.completion).barClassName}
              aria-label={`${initialGame.completion}% completion`}
            />
          </div>
        )}
      </Link>
    </div>
  );
}

export function GamesView({
  games,
  user,
}: {
  games: ReadonlyArray<Game>;
  user?: { personaName: string; avatar: string };
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("playtime");

  const filteredGames = useMemo(() => {
    let result = [...games];

    if (filter === "tracked") {
      result = result.filter((g) => g.tracked);
    } else if (filter === "owned") {
      result = result.filter((g) => g.owned);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((g) => g.name.toLowerCase().includes(q));
    }

    switch (sort) {
      case "playtime":
        result.sort((a, b) => b.hours - a.hours);
        break;
      case "completion":
        result.sort((a, b) => b.completion - a.completion);
        break;
      case "achievements":
        result.sort((a, b) => b.achievements.earned - a.achievements.earned);
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [games, search, filter, sort]);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar user={user} activeHref="/games" />
      <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Mobile top bar */}
          <div className="-mx-4 mb-4 flex items-center gap-3 lg:hidden">
            <MobileSidebar user={user} activeHref="/games" />
            <h2 className="text-xl font-bold text-foreground">Games</h2>
          </div>

          {/* Header */}
          <div className="pb-6">
            <h2 className="hidden text-2xl font-bold text-foreground lg:block" aria-hidden>
              Your Library
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {games.length} game{games.length !== 1 ? "s" : ""} in your Steam library
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:items-center">
            <InputGroup className="flex-1 bg-card">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Search games..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
            <div className="flex items-center gap-3">
              <Select value={filter} onValueChange={(v) => v && setFilter(v)}>
                <SelectTrigger className="h-9 w-36 border-border/50 bg-card text-xs">
                  <SelectValue placeholder="All Games" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All Games</SelectItem>
                    <SelectItem value="owned">Owned</SelectItem>
                    <SelectItem value="tracked">Tracked</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={sort}
                onValueChange={(v) => {
                  const next = SORT_KEYS.find((key) => key === v);

                  if (next) setSort(next);
                }}
              >
                <SelectTrigger className="h-9 w-40 border-border/50 bg-card text-xs">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="playtime">Most Played</SelectItem>
                    <SelectItem value="completion">Completion</SelectItem>
                    <SelectItem value="achievements">Achievements</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Game grid */}
          {filteredGames.length === 0 ? (
            <Empty className="border border-border/30 bg-card/50">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Gamepad2 />
                </EmptyMedia>
                <EmptyTitle>
                  {search ? "No games match your search" : "No games to show"}
                </EmptyTitle>
                <EmptyDescription>
                  {search
                    ? `Try a different search term`
                    : "Try changing the filter to see more games."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredGames.map((game) => (
                <GameCard key={game.appId} game={game} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
