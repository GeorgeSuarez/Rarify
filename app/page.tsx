import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { getDashboardData } from "@/lib/dashboard";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function DashboardLoader({ steamId }: { steamId: string }) {
  const initialData = await getDashboardData({
    steamId,
    filter: "all",
  });
  return <DashboardView initialData={initialData} />;
}

export default async function Home() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader steamId={session.steamId} />
    </Suspense>
  );
}
