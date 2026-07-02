import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList, FileSearch, LayoutGrid, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin · Her Haven" }] }),
  component: AdminOverview,
});

const SECTIONS = [
  {
    to: "/admin/reports",
    label: "Reports",
    desc: "Triage what sisters have flagged.",
    icon: ClipboardList,
  },
  {
    to: "/admin/content",
    label: "Content",
    desc: "Browse, hide, or reinstate any story or reply.",
    icon: FileSearch,
  },
  {
    to: "/admin/members",
    label: "Members",
    desc: "Search sisters and change their roles.",
    icon: Users,
  },
  {
    to: "/admin/categories",
    label: "Categories",
    desc: "Reorder, edit, or add rooms.",
    icon: LayoutGrid,
  },
];

function AdminOverview() {
  // Live at-a-glance counts. Falls back to em-dash while loading.
  const { data: pending } = useQuery({
    queryKey: ["admin-overview-pending-reports"],
    queryFn: async () => {
      const { count } = await supabase
        .from("reports")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const { data: hidden } = useQuery({
    queryKey: ["admin-overview-hidden-content"],
    queryFn: async () => {
      const [{ count: hp }, { count: hc }] = await Promise.all([
        supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .not("hidden_at", "is", null),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .not("hidden_at", "is", null),
      ]);
      return (hp ?? 0) + (hc ?? 0);
    },
  });

  const { data: members } = useQuery({
    queryKey: ["admin-overview-members"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-overview-categories"],
    queryFn: async () => {
      const { count } = await supabase
        .from("categories")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const counts: Record<string, number | "—"> = {
    "/admin/reports": pending ?? "—",
    "/admin/content": hidden ?? "—",
    "/admin/members": members ?? "—",
    "/admin/categories": categories ?? "—",
  };

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Pick a section to dig in. Counts on the right reflect what is active
        right now across the community.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const count = counts[s.to];
          return (
            <Link
              key={s.to}
              to={s.to}
              className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-[var(--rose)]/60 hover:shadow-[0_18px_40px_-20px_oklch(0.42_0.10_20_/_0.45)]"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--rose-soft)]/70 text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/20">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-lg text-foreground group-hover:underline">
                  {s.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <span className="grid h-9 min-w-12 place-items-center rounded-full bg-[var(--rose-soft)] px-3 text-sm font-semibold text-[var(--rose-deep)] tabular-nums">
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
