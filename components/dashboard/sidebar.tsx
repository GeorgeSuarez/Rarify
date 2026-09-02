import {
  Gamepad2,
  Trophy,
  Users,
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  active?: boolean;
  disabled?: boolean;
  badge?: string;
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", href: "/", active: true },
  { icon: Gamepad2, label: "Games", href: "/games" },
  {
    icon: Trophy,
    label: "Achievements",
    href: "/achievements",
  },
  { icon: Users, label: "Friends", href: "/friends" },
  {
    icon: BarChart3,
    label: "Insights",
    href: "/insights",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/settings",
  },
];

export function SidebarContent({
  user,
  activeHref = "/",
}: {
  user?: { personaName: string; avatar: string };
  activeHref?: string;
}) {
  return (
    <div className="flex flex-col px-4 py-6">
      <div className="flex items-center gap-3 px-2">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary">
          <Gamepad2 className="size-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-semibold leading-tight text-foreground">
            Rarify
          </h1>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard
          </p>
        </div>
      </div>

      <nav aria-label="Primary" className="mt-8 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = !item.disabled && item.href === activeHref;
          return item.disabled ? (
            <span
              key={item.label}
              className="flex cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/50"
              aria-disabled="true"
              title="Coming soon"
            >
              <span className="flex items-center gap-3">
                <item.icon className="size-5" />
                {item.label}
              </span>
              <span className="rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground">
                {item.badge}
              </span>
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col">
        <form action="/auth/logout" method="post" className="mt-2">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-5" />
            Logout
          </button>
        </form>
        {user && (
          <div className="flex items-center gap-3 px-2 py-5">
            <Avatar className="size-9 border border-sidebar-border">
              <AvatarImage src={user.avatar} />
              <AvatarFallback>
                {user.personaName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user.personaName}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({
  user,
  activeHref,
}: {
  user?: { personaName: string; avatar: string };
  activeHref?: string;
}) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
      <SidebarContent user={user} activeHref={activeHref} />
    </aside>
  );
}
