import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import {
  ClipboardList,
  FileSearch,
  LayoutGrid,
  Shield,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/admin", label: "Overview", icon: Shield, exact: true },
  { to: "/admin/reports", label: "Reports", icon: ClipboardList },
  { to: "/admin/content", label: "Content", icon: FileSearch },
  { to: "/admin/members", label: "Members", icon: Users },
  { to: "/admin/categories", label: "Categories", icon: LayoutGrid },
];

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Her Haven" }] }),
  beforeLoad: async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user.id);
    const isAuthorized = (roles ?? []).some(
      (r) => r.role === "admin" || r.role === "moderator",
    );
    if (!isAuthorized) throw redirect({ to: "/feed" });
  },
  component: AdminShell,
});

function AdminShell() {
  const { isAdmin, isModerator } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <p className="eyebrow">Stewardship</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
        Admin
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isAdmin ? "Admin" : isModerator ? "Moderator" : ""} dashboard
      </p>

      <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* Sidebar */}
        <aside className="lg:w-48 lg:shrink-0">
          <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card/60 p-1 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible">
            {NAV.map((n) => {
              const active = n.exact
                ? pathname === n.to
                : pathname?.startsWith(n.to);
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Outlet: sub-route renders here */}
        <div className="min-w-0 flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
