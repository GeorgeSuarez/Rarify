import { AlertTriangle, Gamepad2 } from "lucide-react";
import { Link, useRouteError } from "react-router";
import { Button } from "@/components/ui/button";

/**
 * Screens the router needs before any dashboard chunk loads.
 *
 * `RouteErrorPage` is an `errorElement`, so it has to be available without a
 * lazy boundary — a failed chunk would otherwise re-trigger the error it is
 * meant to render. `NotFoundPage` is the catch-all route. Both live here rather
 * than in `index.tsx` so importing them does not pull in the dashboard views.
 */

/** Unknown route fallback matching the previous Next.js not-found screen. */
export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary">
        <Gamepad2 className="h-8 w-8 text-primary-foreground" aria-hidden />
      </div>
      <div>
        <h1 className="text-4xl font-bold text-foreground">404</h1>
        <p className="mt-2 text-lg font-medium text-foreground">Page not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Button render={<Link to="/">Back to Dashboard</Link>} />
    </main>
  );
}

/** Route-level error boundary matching the previous Next.js error screen. */
export function RouteErrorPage() {
  const error = useRouteError();

  const message =
    error instanceof Error ? error.message : "We hit an unexpected error while loading this page.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-5 rounded-xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    </main>
  );
}
