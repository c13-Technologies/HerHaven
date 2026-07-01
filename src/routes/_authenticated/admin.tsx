import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin · Her Haven" }] }),
  beforeLoad: async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw redirect({ to: "/auth", search: { mode: "signin" } });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "moderator");
    if (!isAdmin) throw redirect({ to: "/feed" });
  },
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, isModerator } = useAuth();
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [{ count: users }, { count: posts }, { count: comments }, { count: pendingReports }] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("posts").select("id", { count: "exact", head: true }),
          supabase.from("comments").select("id", { count: "exact", head: true }),
          supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        ]);
      return { users, posts, comments, pendingReports };
    },
  });

  const { data: reports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const updateReport = async (
    rid: string,
    status: "reviewed" | "dismissed" | "actioned",
    targetType?: string,
    targetId?: string,
  ) => {
    await supabase.from("reports").update({ status }).eq("id", rid);
    if (status === "actioned" && targetType && targetId) {
      if (targetType === "post") await supabase.from("posts").delete().eq("id", targetId);
      if (targetType === "comment") await supabase.from("comments").delete().eq("id", targetId);
    }
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
    qc.invalidateQueries({ queryKey: ["admin-stats"] });
    toast.success("Report updated.");
  };

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <p className="eyebrow">Stewardship</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
        Admin
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isAdmin ? "Admin" : isModerator ? "Moderator" : ""} dashboard
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { k: "Members", v: stats?.users ?? "—" },
          { k: "Stories", v: stats?.posts ?? "—" },
          { k: "Replies", v: stats?.comments ?? "—" },
          { k: "Open reports", v: stats?.pendingReports ?? "—" },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{s.k}</p>
            <p className="mt-2 font-serif text-3xl text-foreground">{s.v}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-14 font-serif text-2xl text-foreground">Reports</h2>
      <div className="mt-5 space-y-3">
        {(reports ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="tag-chip">{r.status}</span>
              <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
            </div>
            <p className="mt-3 text-sm text-foreground">
              <span className="font-medium">{r.target_type}</span> · {r.reason}
            </p>
            {r.target_type === "post" && (
              <Link
                to="/post/$id"
                params={{ id: r.target_id }}
                className="mt-2 inline-block text-xs underline"
              >
                View story →
              </Link>
            )}
            {r.status === "pending" && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => updateReport(r.id, "dismissed")}>
                  Dismiss
                </Button>
                <Button size="sm" variant="outline" onClick={() => updateReport(r.id, "reviewed")}>
                  Mark reviewed
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => updateReport(r.id, "actioned", r.target_type, r.target_id)}
                >
                  Remove content
                </Button>
              </div>
            )}
          </div>
        ))}
        {reports && reports.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No reports right now.
          </p>
        )}
      </div>
    </div>
  );
}
