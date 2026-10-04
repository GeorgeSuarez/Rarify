import { Link } from "@/src/spa/next-compat";
import { ArrowLeft, AlertTriangle, EyeOff, Trophy } from "lucide-react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { DashboardData } from "@/lib/types";
import type { FriendSummary } from "@/src/domain/dashboard";

function CompareRow({
  label,
  yourValue,
  friendValue,
  format,
}: {
  label: string;
  yourValue: number | string;
  friendValue: number | string;
  format?: "number" | "percent";
}) {
  const yourNum = Number(yourValue);
  const friendNum = Number(friendValue);
  const youWin = yourNum > friendNum;
  const tie = yourNum === friendNum;

  return (
    <TableRow>
      <TableCell className="py-3 pr-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </TableCell>
      <TableCell className={`py-3 text-right ${youWin ? "font-semibold text-foreground" : "text-muted-foreground/60"}`}>
        {format === "percent" ? `${yourValue}%` : yourValue}
      </TableCell>
      <TableCell className="w-8 px-2 text-center text-[10px] text-muted-foreground">vs</TableCell>
      <TableCell className={`py-3 text-left ${!tie && !youWin ? "font-semibold text-foreground" : "text-muted-foreground/60"}`}>
        {format === "percent" ? `${friendValue}%` : friendValue}
      </TableCell>
      <TableCell className="py-3 pl-4">
        {!tie && (
          <Badge
            variant="secondary"
            className={youWin ? "bg-green-500/10 text-green-400" : "bg-orange-500/10 text-orange-400"}
          >
            <Trophy data-icon="inline-start" />
            {youWin ? "You" : "Them"}
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

export function FriendCompareView({
  yourData,
  friendData,
  friendInfo,
}: {
  yourData: DashboardData;
  friendData: DashboardData;
  friendInfo?: FriendSummary;
}) {
  const friendName = friendInfo?.name ?? friendData.user?.personaName ?? "Friend";
  const friendAvatar = friendInfo?.avatar ?? friendData.user?.avatar ?? "";

  if (yourData.error || friendData.error) {
    return (
      <div className="flex min-h-screen w-full">
        <Sidebar activeHref="/friends" />
        <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <Link
              href="/friends"
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to friends
            </Link>
            <Alert
              variant="destructive"
              className="flex flex-col items-center gap-3 py-8 text-center"
            >
              {yourData.error?.type === "private_profile" || friendData.error?.type === "private_profile" ? (
                <>
                  <EyeOff className="size-8" />
                  <AlertTitle>
                    {friendData.error?.type === "private_profile"
                      ? `${friendName}'s profile is private`
                      : "Your profile is private"}
                  </AlertTitle>
                </>
              ) : (
                <>
                  <AlertTriangle className="size-8" />
                  <AlertTitle>Couldn&apos;t fetch data to compare</AlertTitle>
                </>
              )}
              <AlertDescription>
                Check that both profiles are public and try again.
              </AlertDescription>
            </Alert>
          </div>
        </main>
      </div>
    );
  }

  const yourStats = yourData.stats;
  const friendStats = friendData.stats;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar activeHref="/friends" />
      <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Mobile top bar */}
          <div className="-mx-4 mb-4 flex items-center gap-3 lg:hidden">
            <MobileSidebar activeHref="/friends" />
            <h2 className="text-xl font-bold text-foreground">Compare</h2>
          </div>

          {/* Back link */}
          <Link
            href="/friends"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back to friends
          </Link>

          {/* VS header */}
          <div className="mb-6 flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <Avatar className="size-16 border-2 border-primary">
                {yourData.user?.avatar && <AvatarImage src={yourData.user.avatar} />}
                <AvatarFallback>YOU</AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-foreground">
                {yourData.user?.personaName ?? "You"}
              </p>
            </div>
            <div className="text-2xl font-bold text-muted-foreground">VS</div>
            <div className="flex flex-col items-center gap-2">
              <Avatar className="size-16 border-2 border-muted-foreground">
                {friendAvatar && <AvatarImage src={friendAvatar} />}
                <AvatarFallback>
                  {friendName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-semibold text-foreground">
                {friendName}
              </p>
            </div>
          </div>

          {/* Unified comparison chart */}
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Stats Comparison</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Stat</TableHead>
                    <TableHead className="text-right">{yourData.user?.personaName ?? "You"}</TableHead>
                    <TableHead className="w-8 px-2" />
                    <TableHead>{friendName}</TableHead>
                    <TableHead className="pl-4">Leader</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <CompareRow label="Achievements Earned" yourValue={yourStats.achievementsEarned} friendValue={friendStats.achievementsEarned} />
                  <CompareRow label="Avg Completion" yourValue={yourStats.avgCompletion} friendValue={friendStats.avgCompletion} format="percent" />
                  <CompareRow label="Games Owned" yourValue={yourStats.gamesOwned} friendValue={friendStats.gamesOwned} />
                  <CompareRow label="Perfect Games" yourValue={yourStats.perfectGames} friendValue={friendStats.perfectGames} />
                  <CompareRow label="Games Tracked" yourValue={yourStats.gamesTracked} friendValue={friendStats.gamesTracked} />
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
