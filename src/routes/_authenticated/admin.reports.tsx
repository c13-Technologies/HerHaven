import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldAlert } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type ReportStatus = "pending" | "reviewed" | "dismissed" | "actioned";

type ReportRow = {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment" | "user";
  target_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  metadata: { mod_notes?: string } | null;
  reporter: { username: string | null; display_name: string | null } | null;
};

type PostPreview = {
  id: string;
  title: string;
  body: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
};

type CommentPreview = {
  id: string;
  body: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
};

const FILTERS: Array<{ key: "all" | ReportStatus; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "reviewed", label: "Reviewed" },
  { key: "dismissed", label: "Dismissed" },
  { key: "actioned", label: "Actioned" },
];

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports · Admin · Her Haven" }] }),
  component: AdminReportsPage,
});

function AdminReportsPage() {
  const qc = useQueryClient();

  const [filter, setFilter] = useState<"all" | ReportStatus>("pending");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [hideFor, setHideFor] = useState<ReportRow | null>(null);
  const [hideReason, setHideReason] = useState("");

  const [notesEditing, setNotesEditing] = useState<ReportRow | null>(null);
  const [notesDraft, setNotesDraft] = useState("");

  const [bulkConfirm, setBulkConfirm] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  // Reset selection when the underlying result set changes shape.
  useEffect(() => {
    setSelected(new Set());
  }, [filter, debounced]);

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
    queryKey: ["admin-reports-v2", filter, debounced],
    queryFn: async () => {
      let q = supabase
        .from("reports")
        .select(
          "*, reporter:reporter_id(username, display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (filter !== "all") q = q.eq("status", filter);
      if (debounced.length >= 2) {
        const safe = debounced.replace(/[%_\\]/g, (m) => "\\" + m);
        q = q.ilike("reason", `*${safe}*`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ReportRow[];
    },
  });

  // Target previews — fetch in batch by target_type + IDs.
  const postIds = useMemo(
    () =>
      Array.from(
        new Set(
          (reports ?? [])
            .filter((r) => r.target_type === "post")
            .map((r) => r.target_id),
        ),
      ),
    [reports],
  );
  const commentIds = useMemo(
    () =>
      Array.from(
        new Set(
          (reports ?? [])
            .filter((r) => r.target_type === "comment")
            .map((r) => r.target_id),
        ),
      ),
    [reports],
  );

  const { data: postPreviews } = useQuery({
    queryKey: ["admin-r-post-previews", postIds.join(",")],
    enabled: postIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title, body, hidden_at, hidden_reason")
        .in("id", postIds);
      return (data ?? []) as unknown as PostPreview[];
    },
  });

  const { data: commentPreviews } = useQuery({
    queryKey: ["admin-r-comment-previews", commentIds.join(",")],
    enabled: commentIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, body, hidden_at, hidden_reason")
        .in("id", commentIds);
      return (data ?? []) as unknown as CommentPreview[];
    },
  });

  const postPreviewById = useMemo(
    () => new Map((postPreviews ?? []).map((p) => [p.id, p])),
    [postPreviews],
  );
  const commentPreviewById = useMemo(
    () => new Map((commentPreviews ?? []).map((c) => [c.id, c])),
    [commentPreviews],
  );

  /** Update a report's status. "actioned" routes through admin_hide_content. */
  const updateReport = async (
    rid: string,
    status: ReportStatus,
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
      qc.invalidateQueries({ queryKey: ["admin-reports-v2"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-pending-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-hidden-content"] });
      qc.invalidateQueries({ queryKey: ["admin-r-post-previews"] });
      qc.invalidateQueries({ queryKey: ["admin-r-comment-previews"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    }
  };

  const submitHideFromReportsQueue = async () => {
    if (!hideFor) return;
    await updateReport(
      hideFor.id,
      "actioned",
      hideFor.target_type,
      hideFor.target_id,
      hideReason || hideFor.reason,
    );
    setHideFor(null);
    setHideReason("");
  };

  const bulkDismiss = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: "dismissed" })
        .in("id", ids);
      if (error) throw error;
      toast.success(
        `${ids.length} report${ids.length === 1 ? "" : "s"} dismissed.`,
      );
      qc.invalidateQueries({ queryKey: ["admin-reports-v2"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-pending-reports"] });
      setSelected(new Set());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Bulk dismiss failed";
      toast.error(msg);
    } finally {
      setBulkConfirm(false);
    }
  };

  const saveNotes = async () => {
    if (!notesEditing) return;
    const newMeta = {
      ...(notesEditing.metadata ?? {}),
      mod_notes: notesDraft,
      notes_updated_at: new Date().toISOString(),
    };
    try {
      const { error } = await supabase
        .from("reports")
        .update({ metadata: newMeta })
        .eq("id", notesEditing.id);
      if (error) throw error;
      toast.success("Notes saved.");
      qc.invalidateQueries({ queryKey: ["admin-reports-v2"] });
      setNotesEditing(null);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    }
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (!reports) return;
    const allIds = reports.map((r) => r.id);
    const allChecked = allIds.every((id) => selected.has(id));
    setSelected(allChecked ? new Set() : new Set(allIds));
  };
  const allChecked =
    !!reports && reports.length > 0 && reports.every((r) => selected.has(r.id));

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

      <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Reports</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Triage what sisters have flagged.
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {selected.size} selected
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
            <Button size="sm" onClick={() => setBulkConfirm(true)}>
              <ShieldAlert className="mr-1 h-3.5 w-3.5" />
              Bulk dismiss
            </Button>
          </div>
        )}
      </div>

      {/* Filters row */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1 rounded-full border border-border bg-card/60 p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={
                "rounded-full px-3.5 py-1 text-xs transition " +
                (filter === f.key
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reason…"
            className="h-9 pl-9"
            aria-label="Search reports by reason"
          />
        </div>
        {reports && reports.length > 0 && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox
              checked={allChecked}
              onCheckedChange={toggleAll}
              aria-label="Select all visible reports"
            />
            Select all
          </label>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {(reports ?? []).map((r) => {
          const postPreview =
            r.target_type === "post"
              ? (postPreviewById.get(r.target_id) ?? null)
              : null;
          const commentPreview =
            r.target_type === "comment"
              ? (commentPreviewById.get(r.target_id) ?? null)
              : null;
          const isSelected = selected.has(r.id);
          const reporterName =
            r.reporter?.display_name ?? r.reporter?.username ?? "a sister";
          return (
            <div
              key={r.id}
              className={
                "rounded-2xl border bg-card p-5 transition " +
                (isSelected
                  ? "border-[var(--rose-deep)]/40 bg-[var(--rose-soft)]/15"
                  : "border-border")
              }
            >
              <div className="flex flex-wrap items-start gap-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleRow(r.id)}
                  aria-label={`Select report ${r.id}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="tag-chip">{r.status}</span>
                    <span aria-hidden>·</span>
                    <span>
                      Reported by{" "}
                      <span className="text-foreground">{reporterName}</span>{" "}
                      {formatDistanceToNow(new Date(r.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-foreground">
                    <span className="font-medium capitalize">
                      {r.target_type}
                    </span>{" "}
                    · {r.reason}
                  </p>
                  {postPreview && (
                    <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                      <p className="font-serif text-base text-foreground">
                        {postPreview.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(postPreview.body ?? "").slice(0, 220)}
                        {(postPreview.body ?? "").length > 220 ? "…" : ""}
                      </p>
                      {postPreview.hidden_at && (
                        <p className="mt-2 inline-flex items-center rounded-full bg-[var(--rose-soft)]/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--rose-deep)]">
                          Hidden
                          {postPreview.hidden_reason
                            ? ` · ${postPreview.hidden_reason}`
                            : ""}
                        </p>
                      )}
                    </div>
                  )}
                  {commentPreview && (
                    <div className="mt-3 rounded-xl border border-border bg-background/60 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                        Reply
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {(commentPreview.body ?? "").slice(0, 220)}
                        {(commentPreview.body ?? "").length > 220 ? "…" : ""}
                      </p>
                      {commentPreview.hidden_at && (
                        <p className="mt-2 inline-flex items-center rounded-full bg-[var(--rose-soft)]/60 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--rose-deep)]">
                          Hidden
                          {commentPreview.hidden_reason
                            ? ` · ${commentPreview.hidden_reason}`
                            : ""}
                        </p>
                      )}
                    </div>
                  )}
                  {r.target_type === "post" && (
                    <Link
                      to="/post/$id"
                      params={{ id: r.target_id }}
                      className="mt-2 inline-block text-xs underline"
                    >
                      View story →
                    </Link>
                  )}
                  {r.metadata?.mod_notes && (
                    <div className="mt-3 rounded-lg border-l-2 border-[var(--rose-deep)]/30 bg-muted/40 p-3 text-xs">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Mod notes
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">
                        {r.metadata.mod_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setNotesEditing(r);
                    setNotesDraft(r.metadata?.mod_notes ?? "");
                  }}
                >
                  Notes
                </Button>
                {r.status === "pending" && (
                  <>
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
                      onClick={() => setHideFor(r)}
                    >
                      <ShieldAlert className="mr-1 h-3.5 w-3.5" />
                      Hide content
                    </Button>
                  </>
                )}
                {r.status !== "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateReport(r.id, "pending")}
                  >
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {reports && reports.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            {filter === "pending"
              ? "No reports awaiting review. Quiet days are good days."
              : "Nothing here."}
          </p>
        )}
      </div>

      {/* Hide from reports-queue dialog */}
      <Dialog
        open={!!hideFor}
        onOpenChange={(o) => {
          if (!o) {
            setHideFor(null);
            setHideReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide this content</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Soft-deletes the {hideFor?.target_type} and auto-resolves any
            matching pending reports. The author will see a "Removed by a
            moderator" banner if they visit it. Action is audit-logged.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Original report reason:{" "}
            <span className="text-foreground">{hideFor?.reason}</span>
          </p>
          <Input
            value={hideReason}
            onChange={(e) => setHideReason(e.target.value)}
            placeholder="Reason (visible to author)…"
            className="mt-2"
            maxLength={300}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHideFor(null);
                setHideReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitHideFromReportsQueue}
              disabled={!hideReason.trim()}
            >
              Hide content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes dialog */}
      <Dialog
        open={!!notesEditing}
        onOpenChange={(o) => !o && setNotesEditing(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mod-only notes</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Notes stay on this report — only mods can see them.
          </p>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            maxLength={1500}
            rows={5}
            placeholder="Reasoning, followups, things to remember…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesEditing(null)}>
              Cancel
            </Button>
            <Button onClick={saveNotes}>Save notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk dismiss confirm */}
      <AlertDialog open={bulkConfirm} onOpenChange={setBulkConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk dismiss</AlertDialogTitle>
            <AlertDialogDescription>
              Dismiss {selected.size} {selected.size === 1 ? "report" : "reports"}?
              They stop appearing in the queue but stay recorded in the audit
              trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={bulkDismiss}>Dismiss all</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
