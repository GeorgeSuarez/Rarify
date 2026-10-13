import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { InsightsCards } from "@/components/dashboard/insights-cards";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DashboardData } from "@/lib/types";

export function InsightsView({ initialData }: { initialData: DashboardData }) {
  const data = initialData;

  return (
    <div className="dashboard-shell flex w-full">
      <Sidebar user={data.user} activeHref="/insights" />
      <main className="min-w-0 flex-1 bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Mobile top bar */}
          <div className="-ms-4 -me-4 mbe-4 flex items-center gap-3 px-4 lg:hidden">
            <MobileSidebar user={data.user} activeHref="/insights" />
          </div>

          {/* Header */}
          <div className="pbe-6">
            <h2 className="text-[length:var(--text-dashboard-page-title)] font-bold text-foreground">
              Insights
            </h2>
            <p className="mbs-1 text-sm text-muted-foreground">
              Detailed achievement progress and trends over time.
            </p>
          </div>

          {data.error ? (
            <Alert
              variant="destructive"
              className="flex flex-col items-center gap-2 py-8 text-center"
            >
              <AlertTitle>Couldn&apos;t fetch your Steam data</AlertTitle>
              <AlertDescription>
                Steam API returned status {data.error.status ?? "(network error)"}.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <StatsCards stats={data.stats} />
              <InsightsCards data={data} />
            </>
          )}
        </div>
      </main>
    </div>
  );
}
