import { Skeleton } from "@/components/ui/skeleton";

function SidebarSkeleton() {
  return (
    <aside className="dashboard-sidebar-skeleton hidden shrink-0 self-start flex-col gap-6 border-r border-sidebar-border bg-sidebar px-2 py-6 lg:sticky lg:inset-bs-0 lg:flex lg:h-dvh">
      <div className="flex justify-center">
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <nav className="mbs-2 flex flex-col items-center gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="size-10 rounded-lg" />
        ))}
      </nav>
      <div className="mbs-auto flex w-full flex-col items-center gap-2">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="size-9 rounded-full" />
      </div>
    </aside>
  );
}

function StatsSkeleton() {
  return (
    <div className="dashboard-stats">
      <div className="dashboard-stats-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartsSkeleton() {
  return (
    <div className="mbs-6 grid grid-cols-[repeat(auto-fit,minmax(min(100%,22rem),1fr))] gap-6">
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mbe-4 flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-8 w-36 rounded-lg" />
        </div>
        <Skeleton className="aspect-[16/10] w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <Skeleton className="mbe-4 h-5 w-44" />
          <Skeleton className="mx-auto aspect-square w-full max-w-[220px] rounded-full" />
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <Skeleton className="mbe-4 h-5 w-40" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TopGamesSkeleton() {
  return (
    <div className="mbs-6 rounded-xl border border-border/50 bg-card p-6">
      <div className="mbe-4 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="aspect-[460/215] w-24 shrink-0 rounded-lg" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="hidden h-2 w-32 @2xl:block" />
            <Skeleton className="hidden h-4 w-24 @2xl:block" />
            <Skeleton className="hidden h-4 w-40 @2xl:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardContentSkeleton() {
  return (
    <div>
      <StatsSkeleton />
      <ChartsSkeleton />
      <TopGamesSkeleton />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="dashboard-shell flex w-full">
      <SidebarSkeleton />
      <main className="min-w-0 flex-1 bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-start justify-between gap-4 pbe-6">
            <div className="flex min-w-0 flex-col gap-2">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-72" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-36 rounded-lg" />
            </div>
          </div>
          <DashboardContentSkeleton />
        </div>
      </main>
    </div>
  );
}
