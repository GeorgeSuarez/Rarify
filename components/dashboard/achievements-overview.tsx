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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { buildAlphabetIndex } from "@/src/domain/dashboard-calculations";
import { completionTierOf } from "@/lib/completion-tiers";
import type { AchievementsOverview } from "@/src/domain/dashboard";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

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

  const present = useMemo(
    () => new Set(buildAlphabetIndex(searched).map((group) => group.letter)),
    [searched],
  );

  const sections = useMemo(
    () =>
      buildAlphabetIndex(searched).filter((group) => letter === "All" || group.letter === letter),
    [searched, letter],
  );

  const gamesWithAch = data.games.filter((g) => g.achievements.total > 0);

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
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="achievements-search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Type a game name…"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1" role="group" aria-label="Jump to letter">
                    <Button
                      size="xs"
                      variant={letter === "All" ? "default" : "ghost"}
                      onClick={() => setLetter("All")}
                    >
                      All
                    </Button>
                    {ALPHABET.map((char) => (
                      <Button
                        key={char}
                        size="xs"
                        variant={letter === char ? "default" : "ghost"}
                        disabled={!present.has(char)}
                        onClick={() => setLetter(char)}
                        className="min-w-7"
                      >
                        {char}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 flex flex-col gap-4">
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
                    <CardContent className="flex flex-col pt-0">
                      {section.games.map((game, i) => (
                        <div key={game.appId} className="flex flex-col">
                          {i !== 0 && <Separator />}
                          <div className="flex items-center gap-3 py-2.5">
                            <div className="relative h-9 w-16 shrink-0 overflow-hidden rounded bg-muted">
                              <Image
                                src={game.image}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link
                                href={`/games/${game.appId}`}
                                className="block truncate text-sm font-medium text-foreground hover:text-primary"
                              >
                                {game.name}
                              </Link>
                              <span className="mt-1 flex items-center gap-2">
                                <Progress
                                  value={game.completion}
                                  indicatorClassName={
                                    completionTierOf(game.completion).barClassName
                                  }
                                  className="h-1 max-w-40 flex-1"
                                />
                                <Tooltip>
                                  <TooltipTrigger className="text-[11px] tabular-nums text-muted-foreground">
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
                            {game.completion >= 100 && <Badge className="shrink-0">Perfect</Badge>}
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
