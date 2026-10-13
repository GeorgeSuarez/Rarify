import {
  Gamepad2,
  Trophy,
  Users,
  BarChart3,
  Settings,
  LogOut,
  LayoutDashboard,
} from "lucide-react";
import { Link } from "@/src/spa/next-compat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { UserProfile } from "@/lib/types";
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
];

/** Show the player's avatar and name, linking to Steam when the URL is available. */
function SidebarUserProfile({ user }: { user: UserProfile }) {
  const profileContent = (
    <div className="dashboard-sidebar-user flex items-center gap-3 px-2 py-5">
      <Avatar
        aria-label={user.personaName}
        className="size-9 shrink-0 border border-sidebar-border"
      >
        <AvatarImage src={user.avatar} />
        <AvatarFallback>{user.personaName.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="dashboard-sidebar-copy min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{user.personaName}</p>
      </div>
    </div>
  );

  return user.profileUrl ? (
    <a
      href={user.profileUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`View ${user.personaName}'s Steam profile`}
      title={`View ${user.personaName}'s Steam profile`}
      className="dashboard-sidebar-profile-link block rounded-lg [@media(hover:hover)_and_(pointer:fine)]:hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      {profileContent}
    </a>
  ) : (
    profileContent
  );
}

export function SidebarContent({
  user,
  activeHref = "/",
}: {
  user?: UserProfile;
  activeHref?: string;
}) {
  return (
    <div className="dashboard-sidebar-content flex min-h-full flex-col px-4 pbs-6 pbe-10">
      <div className="dashboard-sidebar-brand flex items-center px-2">
        <span
          className="dashboard-sidebar-mark hidden size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground"
          aria-hidden
        >
          R
        </span>
        <div className="dashboard-sidebar-copy">
          <h1 className="truncate text-lg font-semibold leading-tight text-foreground">Rarify</h1>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard
          </p>
        </div>
      </div>

      {user && <SidebarUserProfile user={user} />}

      <nav aria-label="Primary" className="mbs-8 flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = !item.disabled && item.href === activeHref;

          return item.disabled ? (
            <span
              key={item.label}
              className="dashboard-sidebar-link flex cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/50"
              aria-disabled="true"
              title="Coming soon"
            >
              <span className="dashboard-sidebar-disabled-main flex min-w-0 items-center gap-[0.6em]">
                <item.icon className="size-5 shrink-0" aria-hidden />
                <span className="dashboard-sidebar-label truncate">{item.label}</span>
              </span>
              <span className="dashboard-sidebar-badge rounded bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-accent-foreground">
                {item.badge}
              </span>
            </span>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={cn(
                "dashboard-sidebar-link flex touch-manipulation items-center gap-[0.6em] rounded-lg px-3 py-2.5 text-sm font-medium transition-[background-color,color] select-none motion-reduce:transition-none active:scale-[0.98]",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-sidebar-accent [@media(hover:hover)_and_(pointer:fine)]:hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-5 shrink-0" aria-hidden />
              <span className="dashboard-sidebar-label truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mbs-auto flex flex-col gap-1">
        <Link
          href="/settings"
          aria-label="Settings"
          aria-current={activeHref === "/settings" ? "page" : undefined}
          title="Settings"
          className={cn(
            "dashboard-sidebar-link flex touch-manipulation items-center gap-[0.6em] rounded-lg px-3 py-2.5 text-sm font-medium transition-[background-color,color] select-none motion-reduce:transition-none active:scale-[0.98]",
            activeHref === "/settings"
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-sidebar-accent [@media(hover:hover)_and_(pointer:fine)]:hover:text-sidebar-accent-foreground",
          )}
        >
          <Settings className="size-5 shrink-0" aria-hidden />
          <span className="dashboard-sidebar-label truncate">Settings</span>
        </Link>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            aria-label="Log Out"
            title="Log Out"
            className="dashboard-sidebar-link flex w-full touch-manipulation items-center gap-[0.6em] rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-[background-color,color] select-none motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:hover:bg-sidebar-accent [@media(hover:hover)_and_(pointer:fine)]:hover:text-sidebar-accent-foreground active:scale-[0.98]"
          >
            <LogOut className="size-5 shrink-0" aria-hidden />
            <span className="dashboard-sidebar-label">Logout</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function Sidebar({ user, activeHref }: { user?: UserProfile; activeHref?: string }) {
  return (
    <aside className="dashboard-sidebar hidden shrink-0 self-start lg:sticky lg:inset-bs-0 lg:flex lg:h-dvh">
      <SidebarContent user={user} activeHref={activeHref} />
    </aside>
  );
}
