import * as Effect from "effect/Effect";
import { Navigate, useParams } from "react-router";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { GamesView } from "@/components/dashboard/games-view";
import { AchievementList } from "@/components/dashboard/achievement-list";
import { AchievementsOverview } from "@/components/dashboard/achievements-overview";
import { InsightsView } from "@/components/dashboard/insights-view";
import { FriendsView } from "@/components/dashboard/friends-view";
import { FriendCompareView } from "@/components/dashboard/friend-compare-view";
import { SettingsView } from "@/components/dashboard/settings-view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { apiGroups } from "../api.ts";
import { appIdFromRouteParam, steamIdFromRouteParam } from "../route-params.ts";
import { useApi } from "../use-api.ts";
import { NotFoundPage } from "./route-screens.tsx";

function LoadingScreen() {
  return <DashboardSkeleton />;
}

function ApiErrorScreen({ message }: { readonly message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Alert variant="destructive" className="max-w-md">
        <AlertTriangle />
        <AlertTitle>Couldn&apos;t load your Steam data</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </main>
  );
}

/**
 * Dashboard overview screen; loads the enriched library once and hands it to
 * the existing filter-aware React view.
 */
export function OverviewPage() {
  const dashboard = useApi(
    () => apiGroups.dashboard.getDashboard({ query: { filter: "all" } }),
    [],
  );

  if (dashboard.status === "loading") return <LoadingScreen />;

  if (dashboard.status === "unauthorized") return <Navigate to="/login" replace />;

  if (dashboard.status === "error") return <ApiErrorScreen message={dashboard.message} />;

  return <DashboardView initialData={dashboard.data} />;
}

/** Games browser backed by the cached enriched library. */
export function GamesPage() {
  const library = useApi(() => apiGroups.library.getGames(), []);

  if (library.status === "loading") return <LoadingScreen />;

  if (library.status === "unauthorized") return <Navigate to="/login" replace />;

  if (library.status === "error") return <ApiErrorScreen message={library.message} />;

  return <GamesView games={library.data.games} user={library.data.user} />;
}

/** Per-game achievement list keyed by the `:appId` route parameter. */
export function GameAchievementsPage() {
  const { appId: appIdParam } = useParams();
  const appId = appIdFromRouteParam(appIdParam);

  const achievements = useApi(
    () =>
      appId === null
        ? Effect.succeed(null)
        : apiGroups.library
            .getGameAchievements({ params: { appId } })
            .pipe(Effect.map((data) => data)),
    [appId],
  );

  if (achievements.status === "loading") return <LoadingScreen />;

  if (achievements.status === "unauthorized") return <Navigate to="/login" replace />;

  if (achievements.status === "error") return <ApiErrorScreen message={achievements.message} />;

  if (achievements.data === null) return <NotFoundPage />;

  return <AchievementList data={achievements.data} />;
}

/** Aggregated achievements overview. */
export function AchievementsPage() {
  const achievements = useApi(() => apiGroups.achievements.getAchievementsOverview(), []);

  if (achievements.status === "loading") return <LoadingScreen />;

  if (achievements.status === "unauthorized") return <Navigate to="/login" replace />;

  if (achievements.status === "error") return <ApiErrorScreen message={achievements.message} />;

  return <AchievementsOverview data={achievements.data} />;
}

/** Insights screen reusing the dashboard read model. */
export function InsightsPage() {
  const dashboard = useApi(
    () => apiGroups.dashboard.getDashboard({ query: { filter: "all" } }),
    [],
  );

  if (dashboard.status === "loading") return <LoadingScreen />;

  if (dashboard.status === "unauthorized") return <Navigate to="/login" replace />;

  if (dashboard.status === "error") return <ApiErrorScreen message={dashboard.message} />;

  return <InsightsView initialData={dashboard.data} />;
}

/** Steam friends list with privacy summary. */
export function FriendsPage() {
  const friends = useApi(() => apiGroups.friends.getFriends(), []);

  if (friends.status === "loading") return <LoadingScreen />;

  if (friends.status === "unauthorized") return <Navigate to="/login" replace />;

  if (friends.status === "error") return <ApiErrorScreen message={friends.message} />;

  return (
    <FriendsView
      friends={friends.data.friends}
      error={friends.data.error}
      hiddenCount={friends.data.hiddenCount}
    />
  );
}

/** Side-by-side comparison with one Steam friend. */
export function FriendComparePage() {
  const { steamId: steamIdParam } = useParams();
  const steamId = steamIdFromRouteParam(steamIdParam);

  const comparison = useApi(
    () =>
      steamId === null
        ? Effect.succeed(null)
        : apiGroups.friends.getFriendComparison({ params: { steamId } }),
    [steamId],
  );

  if (comparison.status === "loading") return <LoadingScreen />;

  if (comparison.status === "unauthorized") return <Navigate to="/login" replace />;

  if (comparison.status === "error") return <ApiErrorScreen message={comparison.message} />;

  if (comparison.data === null) return <NotFoundPage />;

  return (
    <FriendCompareView
      yourData={comparison.data.yourData}
      friendData={comparison.data.friendData}
      friendInfo={comparison.data.friendInfo}
    />
  );
}

/** Dashboard preference management. */
export function SettingsPage() {
  const preferences = useApi(() => apiGroups.preferences.getPreferences(), []);

  if (preferences.status === "loading") return <LoadingScreen />;

  if (preferences.status === "unauthorized") return <Navigate to="/login" replace />;

  if (preferences.status === "error") return <ApiErrorScreen message={preferences.message} />;

  return <SettingsView initialPrefs={preferences.data} />;
}
