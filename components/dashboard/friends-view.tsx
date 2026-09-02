"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Users, GitCompare, ExternalLink, AlertTriangle } from "lucide-react";
import Link from "next/link";
import type { FriendSummary } from "@/lib/dashboard";
import type { DashboardError } from "@/lib/types";

export function FriendsView({
  friends,
  error,
  hiddenCount = 0,
}: {
  friends: FriendSummary[];
  error: DashboardError;
  hiddenCount?: number;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar activeHref="/friends" />
      <main className="flex-1 overflow-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-4xl">
          {/* Mobile top bar */}
          <div className="-mx-4 mb-4 flex items-center gap-3 lg:hidden">
            <MobileSidebar activeHref="/friends" />
            <h2 className="text-xl font-bold text-foreground">Friends</h2>
          </div>

          {/* Header */}
          <div className="pb-6">
            <h2 className="hidden text-2xl font-bold text-foreground lg:block">
              Friends
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {friends.length} friend{friends.length !== 1 ? "s" : ""} with public stats
              {hiddenCount > 0 && (
                <span className="ml-1.5 text-muted-foreground/60">
                  &middot; {hiddenCount} hidden (private profile)
                </span>
              )}
            </p>
          </div>

          {error ? (
            <Alert variant="destructive" className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertTriangle className="size-8" />
              <AlertTitle>Couldn&apos;t fetch your friends list</AlertTitle>
              <AlertDescription>Make sure your Steam friends list is set to public.</AlertDescription>
            </Alert>
          ) : friends.length === 0 ? (
            <Empty className="border border-border/30 bg-card/50">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>
                  {hiddenCount > 0 ? "No friends with public stats" : "No friends found"}
                </EmptyTitle>
                <EmptyDescription>
                  {hiddenCount > 0
                    ? `All ${hiddenCount} friend${hiddenCount !== 1 ? "s" : ""} have private profiles.`
                    : "Add friends on Steam to see them here."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {friends.map((friend) => (
                <Card
                  key={friend.steamId}
                  className="flex flex-col gap-4 border-border/50 p-4 transition-colors hover:border-border"
                >
                  <CardContent className="flex flex-col gap-4 p-0">
                    <div className="flex items-center gap-4">
                      <Avatar className="size-12 border border-border/50">
                        <AvatarImage src={friend.avatar} />
                        <AvatarFallback>
                          {friend.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">
                          {friend.name}
                        </p>
                        <a
                          href={friend.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          View profile
                          <ExternalLink className="size-3" />
                        </a>
                      </div>
                    </div>
                    <Link href={`/friends/${friend.steamId}`} className="w-full">
                      <Button variant="secondary" className="w-full text-xs">
                        <GitCompare data-icon="inline-start" />
                        Compare stats
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
