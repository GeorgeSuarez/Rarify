import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { LoginPage } from "./spa/pages/login.tsx";
import { RequireSession } from "./spa/pages/require-session.tsx";
import { NotFoundPage, RouteErrorPage } from "./spa/pages/route-screens.tsx";

/**
 * Dashboard screens live behind a lazy boundary.
 *
 * `/login` is the only public route, so an anonymous visitor — and the crawler
 * measuring that page — should not download the dashboard views. Every loader
 * resolves from the same `pages/index.tsx` chunk, so one request covers them all.
 */
const loadDashboardPages = () => import("./spa/pages/index.tsx");

const OverviewPage = lazy(async () => ({ default: (await loadDashboardPages()).OverviewPage }));

const GamesPage = lazy(async () => ({ default: (await loadDashboardPages()).GamesPage }));

const GameAchievementsPage = lazy(async () => ({
  default: (await loadDashboardPages()).GameAchievementsPage,
}));

const AchievementsPage = lazy(async () => ({
  default: (await loadDashboardPages()).AchievementsPage,
}));

const InsightsPage = lazy(async () => ({ default: (await loadDashboardPages()).InsightsPage }));

const FriendsPage = lazy(async () => ({ default: (await loadDashboardPages()).FriendsPage }));

const FriendComparePage = lazy(async () => ({
  default: (await loadDashboardPages()).FriendComparePage,
}));

const SettingsPage = lazy(async () => ({ default: (await loadDashboardPages()).SettingsPage }));

/**
 * Seeded demo screens for local development (see `spa/pages/demo.tsx`).
 *
 * They render the real dashboard views with fixed fixtures and sit outside
 * `RequireSession`, so no Steam credentials or API Worker are needed.
 *
 * The import sits inside the `import.meta.env.DEV` branch so the production
 * build replaces the whole expression with `null` and tree-shakes the demo
 * module away. A plain guard around the routes alone still emits the chunk:
 * the dynamic import stays in the graph, so the fixtures ship even though no
 * route can request them.
 */
const DemoRoutes =
  import.meta.env.DEV === true
    ? lazy(async () => ({ default: (await import("./spa/pages/demo.tsx")).DemoRoutes }))
    : null;

/**
 * Route table for the Rarify single-page application.
 *
 * @returns The routed application shell.
 */
export function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<DashboardSkeleton />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireSession />} errorElement={<RouteErrorPage />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:appId" element={<GameAchievementsPage />} />
            <Route path="/achievements" element={<AchievementsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/friends" element={<FriendsPage />} />
            <Route path="/friends/:steamId" element={<FriendComparePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
          {DemoRoutes === null ? null : <Route path="/demo/*" element={<DemoRoutes />} />}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
