import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, LayoutGrid, User, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const TABS = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/feed", icon: Compass, label: "Feed" },
  { to: "/categories", icon: LayoutGrid, label: "Explore" },
  { to: "/me", icon: User, label: "Profile" },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-lg sm:hidden safe-area-bottom">
      <div className="mx-auto flex h-16 max-w-lg items-center justify-around px-2">
        {TABS.map((tab) => {
          // Special case: profile tab redirects to auth if not logged in
          const to = tab.to === "/me" && !user ? "/auth" : tab.to;
          const active =
            tab.to === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.to);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.to}
              to={to}
              search={to === "/auth" ? { mode: "signin" } : undefined}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition ${
                  active ? "stroke-[2.25px]" : "stroke-[1.5px]"
                }`}
              />
              <span className="text-[10px] font-medium tracking-wide">
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileFab() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <Link
      to="/post/new"
      className="fixed bottom-20 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-foreground text-background shadow-lg transition hover:scale-105 hover:shadow-xl active:scale-95 sm:hidden"
      aria-label="New post"
    >
      <Plus className="h-6 w-6" />
    </Link>
  );
}
