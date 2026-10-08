import { useMemo, useState } from "react";
import { Image } from "@/src/spa/next-compat";
import { Link } from "@/src/spa/next-compat";
import { AlertTriangle, BookMarked, EyeOff, Search } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  buildAlphabetIndex,
  hasEarnedAllGameAchievements,
} from "@/src/domain/dashboard-calculations";
import { completionTierOf } from "@/lib/completion-tiers";
import type { AchievementsOverview } from "@/src/domain/dashboard";

const ACHIEVEMENT_INDEX_LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

/**
 * Achievements overview as an A–Z index: letter jump bar plus search,
 * then letter-grouped game rows with completion progress.
 */
export function AchievementsOverview({ data }: { data: AchievementsOverview }) {
  const [query, setQuery] = useState("");
  const [letter, setLetter] = useState("All");

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();

    if (!q) return data.games;

    return data.games.filter((game) => game.name.toLowerCase().includes(q));
  }, [data.games, query]);

  const groups = useMemo(() => buildAlphabetIndex(searched), [searched]);
  const present = useMemo(() => new Set(groups.map((group) => group.letter)), [groups]);

  const sections = useMemo(
    () => groups.filter((group) => letter === "All" || group.letter === letter),
    [groups, letter],
  );

  const gamesWithAch = useMemo(
    () => data.games.filter((game) => game.achievements.total > 0),
    [data.games],
  );

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar user={data.user} activeHref="/achievements" />
      <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Mobile top bar */}
          <div className="-ms-4 -me-4 mb-4 flex items-center gap-3 px-4 lg:hidden">
            <MobileSidebar user={data.user} activeHref="/achievements" />
          </div>

          {/* Header */}
          <div className="pb-6">
            <h2 className="text-[clamp(1.25rem,1rem_+_1.5vw,1.5rem)] font-bold text-foreground">
              Achievements
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.stats.achievementsEarned.toLocaleString()} earned across {gamesWithAch.length}{" "}
              game
              {gamesWithAch.length !== 1 ? "s" : ""}
            </p>
          </div>

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
                  : `Steam API returned status ${data.error.status ?? "(network error)"}.`}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <BookMarked className="size-4" aria-hidden /> A–Z index · {gamesWithAch.length}{" "}
                    games
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pt-0">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="achievements-search">Find a game</Label>
                    <InputGroup className="h-11">
                      <InputGroupAddon>
                        <Search className="size-[1.2cap] shrink-0" aria-hidden />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="achievements-search"
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setLetter("All");
                        }}
                        placeholder="Type a game name…"
                        className="h-11"
                      />
                    </InputGroup>
                  </div>
                  <div
                    className="flex min-w-0 items-center gap-2"
                    role="group"
                    aria-label="Jump to letter"
                  >
                    <Button
                      size="xs"
                      variant={letter === "All" ? "default" : "ghost"}
                      aria-pressed={letter === "All"}
                      onClick={() => setLetter("All")}
                      className="h-11 min-w-11 shrink-0"
                    >
                      All
                    </Button>
                    <div className="flex min-w-0 flex-1 snap-x snap-proximity items-center gap-1 overflow-x-auto [scroll-padding-inline:0.5rem] [justify-content:safe_start]">
                      {ACHIEVEMENT_INDEX_LETTERS.map((char) => (
                        <Button
                          key={char}
                          size="xs"
                          variant={letter === char ? "default" : "ghost"}
                          aria-pressed={letter === char}
                          disabled={!present.has(char)}
                          onClick={() => setLetter(char)}
                          className="h-11 min-w-11 shrink-0 snap-start"
                        >
                          {char}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="mbs-4 flex flex-col gap-4">
                {sections.map((section) => (
                  <Card key={section.letter}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                          {section.letter}
                        </span>
                        <CardTitle className="text-sm">
                          {section.games.length} game
                          {section.games.length === 1 ? "" : "s"}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col pbs-0">
                      {section.games.map((game, i) => (
                        <div key={game.appId} className="flex flex-col">
                          {i !== 0 && <Separator />}
                          <div className="flex items-center gap-3 pbs-2.5 pbe-2.5">
                            <div className="relative aspect-[460/215] w-16 shrink-0 overflow-clip rounded bg-muted outline-1 outline-offset-[-1px] outline-foreground/10">
                              <Image
                                src={game.image}
                                alt=""
                                fill
                                className="h-full w-full object-cover"
                                sizes="64px"
                              />
                            </div>
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <Link
                                href={`/games/${game.appId}`}
                                className="block min-w-0 truncate text-sm font-medium text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                              >
                                {game.name}
                              </Link>
                              <span className="flex min-w-0 items-center gap-2">
                                <Progress
                                  value={game.completion}
                                  aria-label={`${game.completion}% completion for ${game.name}`}
                                  indicatorClassName={
                                    completionTierOf(game.completion).barClassName
                                  }
                                  className="h-1 max-w-40 flex-1"
                                />
                                <Tooltip>
                                  <TooltipTrigger className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                    {game.achievements.earned}/{game.achievements.total} ·{" "}
                                    <span
                                      className={completionTierOf(game.completion).textClassName}
                                    >
                                      {game.completion}%
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {game.hours}h played ·{" "}
                                    {game.achievements.total - game.achievements.earned} remaining
                                  </TooltipContent>
                                </Tooltip>
                              </span>
                            </div>
                            {hasEarnedAllGameAchievements(game) && (
                              <Badge className="shrink-0">Perfect</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
                {sections.length === 0 && (
                  <Card>
                    <CardContent className="p-0">
                      <Empty className="py-10">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            <Search />
                          </EmptyMedia>
                          <EmptyTitle>
                            {query ? `No games match “${query}”` : `No games under “${letter}”`}
                          </EmptyTitle>
                        </EmptyHeader>
                      </Empty>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
