import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getGameHeaderImage } from "../../domain/game-images.ts";
import type { DashboardData } from "@/lib/types";
import {
  PROTOTYPE_FONTS_URL,
  resolveFontVariant,
} from "../font-variants.ts";
import { PrototypeFontSwitcher } from "../components/prototype-font-switcher.tsx";

/**
 * PROTOTYPE (throwaway, experiment/dashboard-fonts branch only):
 * "Four typeface directions for the dashboard, switchable via `?variant=`
 * on the `/prototype/fonts` route."
 *
 * Renders the real `DashboardView` with fixed mock data so fonts can be
 * judged against real density (sidebar, stat cards, game rows, achievement
 * lists) without a Steam session or API worker. No fetching, no mutations.
 */
export function PrototypeFontsPage() {
  const [searchParams] = useSearchParams();
  const variant = resolveFontVariant(searchParams.get("variant"));

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = PROTOTYPE_FONTS_URL;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div style={{ fontFamily: variant.stack }}>
      <DashboardView initialData={MOCK_DASHBOARD} />
      <PrototypeFontSwitcher current={variant.key} />
    </div>
  );
}

const MOCK_DASHBOARD: DashboardData = {
  stats: {
    achievementsEarned: 1847,
    achievementsEarnedDelta: 23,
    avgCompletion: 68,
    avgCompletionDelta: 2,
    gamesOwned: 142,
    gamesOwnedDelta: null,
    gamesTracked: 6,
    perfectGames: 11,
  },
  games: [
    {
      appId: 1245620,
      name: "Elden Ring",
      hours: 120,
      completion: 82,
      achievements: { earned: 35, total: 42 },
      comparison: { text: "12% above average", percent: 12, isPositive: true },
      image: getGameHeaderImage(1245620),
      owned: true,
      tracked: true,
      unlocktimes: [1754000000],
    },
    {
      appId: 292030,
      name: "The Witcher 3: Wild Hunt",
      hours: 98,
      completion: 100,
      achievements: { earned: 78, total: 78 },
      comparison: { text: "31% above average", percent: 31, isPositive: true },
      image: getGameHeaderImage(292030),
      owned: true,
      tracked: true,
      unlocktimes: [1753900000],
    },
    {
      appId: 367520,
      name: "Hollow Knight",
      hours: 45,
      completion: 71,
      achievements: { earned: 45, total: 63 },
      comparison: { text: "8% above average", percent: 8, isPositive: true },
      image: getGameHeaderImage(367520),
      owned: true,
      tracked: true,
      unlocktimes: [1753800000],
    },
    {
      appId: 220,
      name: "Half-Life 2",
      hours: 14,
      completion: 100,
      achievements: { earned: 33, total: 33 },
      comparison: { text: "On par with average", percent: 0, isPositive: false },
      image: getGameHeaderImage(220),
      owned: true,
      tracked: false,
      unlocktimes: [1753700000],
    },
    {
      appId: 620,
      name: "Portal 2",
      hours: 11,
      completion: 64,
      achievements: { earned: 32, total: 50 },
      comparison: { text: "5% below average", percent: -5, isPositive: false },
      image: getGameHeaderImage(620),
      owned: true,
      tracked: false,
      unlocktimes: [1753600000],
    },
    {
      appId: 1145360,
      name: "Hades",
      hours: 87,
      completion: 55,
      achievements: { earned: 27, total: 49 },
      comparison: { text: "19% above average", percent: 19, isPositive: true },
      image: getGameHeaderImage(1145360),
      owned: true,
      tracked: true,
      unlocktimes: [1753500000],
    },
  ],
  recentAchievements: [
    {
      appId: 1245620,
      gameName: "Elden Ring",
      gameImage: getGameHeaderImage(1245620),
      name: "Elden Lord",
      description: "Become the Elden Lord",
      unlocktime: 1754000000,
      globalPercent: 8.4,
    },
    {
      appId: 367520,
      gameName: "Hollow Knight",
      gameImage: getGameHeaderImage(367520),
      name: "Radiance",
      description: "Defeat the Radiance",
      unlocktime: 1753900000,
      globalPercent: 4.1,
    },
    {
      appId: 1145360,
      gameName: "Hades",
      gameImage: getGameHeaderImage(1145360),
      name: "Family Reunion",
      description: "Reunite the family",
      unlocktime: 1753800000,
      globalPercent: 12.7,
    },
  ],
  rarestAchievements: [
    {
      appId: 367520,
      gameName: "Hollow Knight",
      gameImage: getGameHeaderImage(367520),
      name: "Steel Soul",
      description: "Complete the game in Steel Soul mode",
      unlocktime: 1753700000,
      globalPercent: 1.2,
    },
    {
      appId: 1245620,
      gameName: "Elden Ring",
      gameImage: getGameHeaderImage(1245620),
      name: "Age of the Stars",
      description: "Usher in the Age of the Stars",
      unlocktime: 1753600000,
      globalPercent: 3.6,
    },
  ],
  rarityDistribution: [
    { tier: "Common", count: 812, color: "chart-1" },
    { tier: "Uncommon", count: 541, color: "chart-2" },
    { tier: "Rare", count: 322, color: "chart-3" },
    { tier: "Ultra-rare", count: 172, color: "chart-4" },
  ],
  error: null,
  user: { personaName: "Prototype Player", avatar: "" },
};
