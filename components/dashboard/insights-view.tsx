import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { InsightsCards } from "@/components/dashboard/insights-cards";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { DashboardData } from "@/lib/types";

export function InsightsView({ initialData }: { initialData: DashboardData }) {
  const data = initialData;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar user={data.user} activeHref="/insights" />
      <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Mobile top bar */}
          <div className="-mx-4 mb-4 flex items-center gap-3 lg:hidden">
            <MobileSidebar user={data.user} activeHref="/insights" />
            <h2 className="text-xl font-bold text-foreground">Insights</h2>
          </div>

          {/* Header */}
          <div className="pb-6">
            <h2 className="hidden text-2xl font-bold text-foreground lg:block">
              Insights
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Detailed achievement progress and trends over time.
            </p>
          </div>

          {data.error ? (
            <Alert variant="destructive" className="flex flex-col items-center gap-2 py-8 text-center">
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
