import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports · Admin · Her Haven" }] }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [
        { count: users },
        { count: posts },
        { count: comments },
        { count: pendingReports },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
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

  /**
   * Update a report's status. When "actioned", route through the
   * admin_hide_content SECURITY DEFINER RPC so the soft-delete is
   * audit-logged and any matching pending reports on the same target
   * auto-resolve in the DB transaction.
   */
  const updateReport = async (
    rid: string,
    status: "reviewed" | "dismissed" | "actioned",
    targetType?: string,
    targetId?: string,
    reason?: string,
  ) => {
    try {
      if (status === "actioned" && targetType && targetId) {
        if (targetType !== "post" && targetType !== "comment") {
          toast.error("Only post/comment reports can be actioned from here.");
          return;
        }
        const { error: rpcErr } = await supabase.rpc("admin_hide_content", {
          p_type: targetType,
          p_target_id: targetId,
          p_reason: (reason ?? "").trim() || "Removed via report queue.",
        });
        if (rpcErr) throw rpcErr;
        toast.success("Content hidden. Report auto-resolved.");
      } else {
        const { error } = await supabase
          .from("reports")
          .update({ status })
          .eq("id", rid);
        if (error) throw error;
        toast.success("Report updated.");
      }
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-pending-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-hidden-content"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    }
  };

  return (
    <div>
      {/* Stat strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { k: "Members", v: stats?.users ?? "—" },
          { k: "Stories", v: stats?.posts ?? "—" },
          { k: "Replies", v: stats?.comments ?? "—" },
          { k: "Open reports", v: stats?.pendingReports ?? "—" },
        ].map((s) => (
          <div key={s.k} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {s.k}
            </p>
            <p className="mt-2 font-serif text-2xl text-foreground tabular-nums">
              {s.v}
            </p>
          </div>
        ))}
      </div>

      <h2 className="mt-10 font-serif text-2xl text-foreground">Reports</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Stage 2 will add status filters, search, mod-only notes, and bulk
        actions. The "Hide content" button already routes through the
        admin_hide_content RPC for a tamper-resistant audit trail.
      </p>

      <div className="mt-5 space-y-3">
        {(reports ?? []).map((r) => (
          <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="tag-chip">{r.status}</span>
              <span>
                {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
              </span>
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateReport(r.id, "dismissed")}
                >
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateReport(r.id, "reviewed")}
                >
                  Mark reviewed
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() =>
                    updateReport(r.id, "actioned", r.target_type, r.target_id, r.reason)
                  }
                >
                  Hide content
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
