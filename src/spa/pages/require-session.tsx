import { Navigate, Outlet, useLocation } from "react-router";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { AlertTriangle } from "lucide-react";
import { apiGroups } from "../api.ts";
import { useApi } from "../use-api.ts";

/**
 * Gate the dashboard routes behind a verified session.
 *
 * The API also rejects unauthenticated requests, so this guard only improves
 * the first paint; it is not the security boundary.
 */
export function RequireSession() {
  const location = useLocation();
  const session = useApi(() => apiGroups.session.getSessionStatus(), []);

  if (session.status === "loading") {
    return <DashboardSkeleton />;
  }

  if (session.status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle />
          <AlertTitle>Rarify is unavailable</AlertTitle>
          <AlertDescription>{session.message}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (session.status === "unauthorized" || !session.data.authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
