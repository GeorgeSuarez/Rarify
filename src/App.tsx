import { BrowserRouter, Route, Routes } from "react-router";
import {
  AchievementsPage,
  FriendComparePage,
  FriendsPage,
  GameAchievementsPage,
  GamesPage,
  InsightsPage,
  LoginPage,
  NotFoundPage,
  OverviewPage,
  RequireSession,
  RouteErrorPage,
  SettingsPage,
} from "./spa/pages/index.tsx";

/**
 * Route table for the Rarify single-page application.
 *
 * @returns The routed application shell.
 */
export function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}
