import { Link, useParams } from "react-router";
import { FlaskConical } from "lucide-react";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { GamesView } from "@/components/dashboard/games-view";
import { AchievementList } from "@/components/dashboard/achievement-list";
import { AchievementsOverview } from "@/components/dashboard/achievements-overview";
import { InsightsView } from "@/components/dashboard/insights-view";
import { FriendsView } from "@/components/dashboard/friends-view";
import { SettingsView } from "@/components/dashboard/settings-view";
import type { FriendSummary } from "@/src/domain/dashboard";
import { appIdFromRouteParam } from "../route-params.ts";
import { NotFoundPage } from "./route-screens.tsx";
import * as Schema from "effect/Schema";
import { SteamIdSchema } from "@/lib/types";
import type { AchievementsOverview as AchievementsOverviewData } from "@/src/domain/dashboard";
import type { DashboardData, Game, GameAchievement, RecentAchievement, Stats } from "@/lib/types";

/**
 * Seeded demo data for local development.
 *
 * These pages render the real dashboard views with fixed fixtures, so styles
 * and layouts can be reviewed without Steam credentials or the API Worker.
 * The `/demo/*` routes are registered only when `import.meta.env.DEV` is
 * true (see `src/App.tsx`), so none of this ships to production.
 */

const headerFor = (appId: number) =>
  `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;

const NOW = Date.now();

const daysAgo = (days: number) => Math.floor(NOW / 1000) - Math.round(days * 86400);

const demoUser = { personaName: "Demo Player", avatar: "" };

function makeGame(
  appId: number,
  name: string,
  hours: number,
  earned: number,
  total: number,
  tracked: boolean,
  comparison: Game["comparison"],
  recentUnlockDays: ReadonlyArray<number>,
): Game {
  const completion = total === 0 ? 0 : Math.round((earned / total) * 100);

  return {
    appId,
    name,
    hours,
    completion,
    achievements: { earned, total },
    comparison,
    image: headerFor(appId),
    owned: true,
    tracked,
    unlocktimes: recentUnlockDays.map(daysAgo),
  };
}

const demoGames: Game[] = [
  makeGame(
    1145360,
    "Hades",
    94,
    49,
    49,
    true,
    { text: "ahead of", percent: 12, isPositive: true },
    [0.2, 1, 3, 6, 9, 14, 21, 30, 45, 60],
  ),
  makeGame(
    1245620,
    "Elden Ring",
    210,
    40,
    42,
    true,
    { text: "ahead of", percent: 8, isPositive: true },
    [0.5, 2, 5, 8, 12, 20, 35, 50, 80],
  ),
  makeGame(
    1086940,
    "Baldur's Gate 3",
    120,
    33,
    54,
    true,
    { text: "behind", percent: 4, isPositive: false },
    [1, 4, 7, 15, 25, 40, 70],
  ),
  makeGame(
    413150,
    "Stardew Valley",
    85,
    12,
    49,
    false,
    { text: "behind", percent: 22, isPositive: false },
    [3, 11, 28, 55],
  ),
  makeGame(
    292030,
    "The Witcher 3: Wild Hunt",
    150,
    35,
    78,
    false,
    { text: "ahead of", percent: 3, isPositive: true },
    [2, 9, 18, 33, 65, 90],
  ),
  makeGame(
    620,
    "Portal 2",
    12,
    51,
    51,
    false,
    { text: "tied with", percent: 0, isPositive: true },
    [30, 60, 120, 200, 300],
  ),
  makeGame(
    1091500,
    "Cyberpunk 2077",
    0,
    0,
    57,
    false,
    { text: "behind", percent: 61, isPositive: false },
    [],
  ),
];

const demoStats: Stats = {
  achievementsEarned: 220,
  achievementsEarnedDelta: 34,
  avgCompletion: 61,
  avgCompletionDelta: 3,
  gamesOwned: 7,
  gamesOwnedDelta: 1,
  gamesTracked: 3,
  perfectGames: 2,
};

function makeRecent(
  game: Game,
  name: string,
  unlockedDaysAgo: number,
  globalPercent: number,
  description?: string,
): RecentAchievement {
  return {
    appId: game.appId,
    gameName: game.name,
    gameImage: game.image,
    name,
    description,
    unlocktime: daysAgo(unlockedDaysAgo),
    globalPercent,
  };
}

const [hades, eldenRing, bg3, stardew, witcher, portal2] = demoGames;

const demoRecent: RecentAchievement[] = [
  makeRecent(hades, "God of Blood", 0.2, 1.8, "Complete an escape on 32 Heat or higher."),
  makeRecent(eldenRing, "Elden Lord", 0.5, 8.4, "Achieve the Elden Lord ending."),
  makeRecent(bg3, "Jack of All Trades", 1, 2.1, "Multiclass into every class in one playthrough."),
  makeRecent(hades, "Harsh Conditions", 1, 4.6, "Complete the prophecies for Extreme Measures 4."),
  makeRecent(witcher, "Master Marksman", 2, 12.3, "Kill 50 humanoids with headshots."),
  makeRecent(stardew, "Greenhorn", 3, 48.2, "Earn 15,000g."),
];

const demoRarest: RecentAchievement[] = [
  makeRecent(hades, "God of Blood", 0.2, 1.8, "Complete an escape on 32 Heat or higher."),
  makeRecent(bg3, "Jack of All Trades", 1, 2.1, "Multiclass into every class in one playthrough."),
  makeRecent(portal2, "Schadenfreude", 30, 3.9, "Gain the edge over a cooperative partner."),
  makeRecent(eldenRing, "Legendary Armaments", 5, 4.4, "Acquire all legendary armaments."),
];

const demoDashboard: DashboardData = {
  stats: demoStats,
  games: demoGames,
  recentAchievements: demoRecent,
  rarestAchievements: demoRarest,
  rarityDistribution: [
    { tier: "Common", count: 120, color: "var(--muted-foreground)" },
    { tier: "Uncommon", count: 60, color: "#4ade80" },
    { tier: "Rare", count: 25, color: "#60a5fa" },
    { tier: "Very Rare", count: 8, color: "#c084fc" },
    { tier: "Ultra Rare", count: 3, color: "#fbbf24" },
  ],
  error: null,
  user: demoUser,
};

const demoAchievementsOverview: AchievementsOverviewData = {
  stats: demoStats,
  games: demoGames,
  recentAchievements: demoRecent,
  rarestAchievements: demoRarest,
  rarestPerGame: [
    { appId: hades.appId, gameName: hades.name, achievement: demoRarest[0] },
    { appId: bg3.appId, gameName: bg3.name, achievement: demoRarest[1] },
    { appId: eldenRing.appId, gameName: eldenRing.name, achievement: demoRarest[3] },
  ],
  error: null,
  user: demoUser,
};

const ACHIEVEMENT_NAME_POOL = [
  "First Blood",
  "Untouchable",
  "Speedrunner",
  "Completionist",
  "Pacifist",
  "Nightmare Fuel",
  "Secret Ending",
  "Hoarder",
  "Sharpshooter",
  "Ironman",
  "Explorer",
  "Lorekeeper",
] as const;

function demoGameAchievements(game: Game) {
  const { earned, total } = game.achievements;
  const achievements: GameAchievement[] = [];

  for (let i = 0; i < total; i += 1) {
    const achieved = i < earned;
    const name = `${ACHIEVEMENT_NAME_POOL[i % ACHIEVEMENT_NAME_POOL.length]} ${Math.floor(i / ACHIEVEMENT_NAME_POOL.length) + 1}`;

    achievements.push({
      apiname: `DEMO_ACH_${i}`,
      name,
      description: achieved ? `Earned by playing ${game.name} like you mean it.` : "???",
      icon: "",
      icongray: "",
      achieved,
      unlocktime: achieved ? daysAgo(i * 2 + 1) : 0,
      globalPercent: achieved ? 5 + ((i * 7) % 40) : 1 + ((i * 3) % 10),
    });
  }

  return {
    gameName: game.name,
    gameImage: game.image,
    appId: game.appId,
    hours: game.hours,
    totalAchievements: total,
    earnedAchievements: earned,
    completion: game.completion,
    achievements,
    error: null,
  };
}

const demoFriends: FriendSummary[] = [
  {
    steamId: Schema.decodeSync(SteamIdSchema)("76561198000000001"),
    name: "Demo Friend One",
    avatar: "",
    avatarFull: "",
    profileUrl: "https://steamcommunity.com/id/demo-one",
  },
  {
    steamId: Schema.decodeSync(SteamIdSchema)("76561198000000002"),
    name: "Demo Friend Two",
    avatar: "",
    avatarFull: "",
    profileUrl: "https://steamcommunity.com/id/demo-two",
  },
  {
    steamId: Schema.decodeSync(SteamIdSchema)("76561198000000003"),
    name: "Demo Friend Three",
    avatar: "",
    avatarFull: "",
    profileUrl: "https://steamcommunity.com/id/demo-three",
  },
];

const DEMO_LINKS = [
  { href: "/demo", label: "Overview" },
  { href: "/demo/games", label: "Games" },
  { href: `/demo/games/${hades.appId}`, label: "Game detail" },
  { href: "/demo/achievements", label: "Achievements" },
  { href: "/demo/insights", label: "Insights" },
  { href: "/demo/friends", label: "Friends" },
  { href: "/demo/settings", label: "Settings" },
] as const;

function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
      <span className="flex items-center gap-1.5 font-semibold">
        <FlaskConical className="size-3.5 shrink-0" aria-hidden />
        Demo data
      </span>
      <nav aria-label="Demo pages" className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {DEMO_LINKS.map((link) => (
          <Link key={link.href} to={link.href} className="underline-offset-2 hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function DemoOverviewPage() {
  return (
    <>
      <DemoBanner />
      <DashboardView initialData={demoDashboard} />
    </>
  );
}

export function DemoGamesPage() {
  return (
    <>
      <DemoBanner />
      <GamesView games={demoGames} user={demoUser} />
    </>
  );
}

export function DemoGameAchievementsPage() {
  const { appId: appIdParam } = useParams();
  const appId = appIdFromRouteParam(appIdParam);
  const game = demoGames.find((g) => g.appId === appId);

  if (game === undefined) return <NotFoundPage />;

  return (
    <>
      <DemoBanner />
      <AchievementList data={demoGameAchievements(game)} />
    </>
  );
}

export function DemoAchievementsPage() {
  return (
    <>
      <DemoBanner />
      <AchievementsOverview data={demoAchievementsOverview} />
    </>
  );
}

export function DemoInsightsPage() {
  return (
    <>
      <DemoBanner />
      <InsightsView initialData={demoDashboard} />
    </>
  );
}

export function DemoFriendsPage() {
  return (
    <>
      <DemoBanner />
      <FriendsView friends={demoFriends} error={null} hiddenCount={2} />
    </>
  );
}

export function DemoSettingsPage() {
  return (
    <>
      <DemoBanner />
      <SettingsView initialPrefs={{ defaultFilter: "all" }} />
    </>
  );
}
