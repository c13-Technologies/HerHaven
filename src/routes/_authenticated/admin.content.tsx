import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type TypeFilter = "all" | "posts" | "comments";
type StateFilter = "live" | "hidden";

type PostRow = {
  id: string;
  title: string;
  body: string | null;
  created_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
  categories: { name: string; slug: string } | null;
  profiles: { username: string | null; display_name: string | null } | null;
};

type CommentRow = {
  id: string;
  body: string | null;
  created_at: string;
  hidden_at: string | null;
  hidden_reason: string | null;
  post_id: string;
  profiles: { username: string | null; display_name: string | null } | null;
};

type HideTarget = { type: "post" | "comment"; id: string; title: string };

export const Route = createFileRoute("/_authenticated/admin/content")({
  head: () => ({ meta: [{ title: "Content · Admin · Her Haven" }] }),
  component: AdminContentPage,
});

function AdminContentPage() {
  const qc = useQueryClient();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stateFilter, setStateFilter] = useState<StateFilter>("live");
  const [hiding, setHiding] = useState<HideTarget | null>(null);
  const [hideReason, setHideReason] = useState("");
  const [reinstating, setReinstating] = useState<HideTarget | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const includePosts = typeFilter !== "comments";
  const includeComments = typeFilter !== "posts";

  const { data: posts } = useQuery({
    queryKey: ["admin-content-posts", debounced, stateFilter],
    enabled: includePosts,
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select(
          "id, title, body, created_at, hidden_at, hidden_reason, categories:category_slug(name, slug), profiles:author_id(username, display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (debounced.length >= 2) {
        const safe = debounced.replace(/[%_\\]/g, (m) => "\\" + m);
        q = q.or(`title.ilike.*${safe}*,body.ilike.*${safe}*`);
      }
      if (stateFilter === "live") q = q.is("hidden_at", null);
      else q = q.not("hidden_at", "is", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as PostRow[];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["admin-content-comments", debounced, stateFilter],
    enabled: includeComments,
    queryFn: async () => {
      let q = supabase
        .from("comments")
        .select(
          "id, body, created_at, hidden_at, hidden_reason, post_id, profiles:author_id(username, display_name)",
        )
        .order("created_at", { ascending: false })
        .limit(50);
      if (debounced.length >= 2) {
        const safe = debounced.replace(/[%_\\]/g, (m) => "\\" + m);
        q = q.ilike("body", `*${safe}*`);
      }
      if (stateFilter === "live") q = q.is("hidden_at", null);
      else q = q.not("hidden_at", "is", null);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  // Parent-post lookup so comment rows can show "<reply> on <post title>".
  const commentPostIds = useMemo(
    () =>
      Array.from(new Set((comments ?? []).map((c) => c.post_id))),
    [comments],
  );
  const { data: commentParentPosts } = useQuery({
    queryKey: ["admin-content-comment-posts", commentPostIds.join(",")],
    enabled: commentPostIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select("id, title")
        .in("id", commentPostIds);
      return data ?? [];
    },
  });
  const parentTitleById = useMemo(
    () => new Map((commentParentPosts ?? []).map((p) => [p.id, p.title])),
    [commentParentPosts],
  );

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["admin-content-posts"] });
    qc.invalidateQueries({ queryKey: ["admin-content-comments"] });
    qc.invalidateQueries({ queryKey: ["admin-content-comment-posts"] });
    qc.invalidateQueries({ queryKey: ["admin-overview-hidden-content"] });
    qc.invalidateQueries({ queryKey: ["admin-r-post-previews"] });
    qc.invalidateQueries({ queryKey: ["admin-r-comment-previews"] });
    // The main feed query caches posts/comments; bump it too so hidden-by-mod
    // posts stop showing for non-author, non-mod users immediately.
    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["post"] });
  };

  const submitHide = async () => {
    if (!hiding) return;
    try {
      const { error } = await supabase.rpc("admin_hide_content", {
        p_type: hiding.type,
        p_target_id: hiding.id,
        p_reason: hideReason.trim(),
      });
      if (error) throw error;
      toast.success("Hidden.");
      invalidateAll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Hide failed");
    }
    setHiding(null);
    setHideReason("");
  };

  const submitReinstate = async () => {
    if (!reinstating) return;
    try {
      const { error } = await supabase.rpc("admin_reinstate_content", {
        p_type: reinstating.type,
        p_target_id: reinstating.id,
      });
      if (error) throw error;
      toast.success("Reinstated. Content is live again.");
      invalidateAll();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reinstate failed");
    }
    setReinstating(null);
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Content</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Search any post or reply. Hide or reinstate with a reason.
          </p>
        </div>
      </div>

      {/* Filters row */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-full border border-border bg-card/60 p-1">
          {(["all", "posts", "comments"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTypeFilter(t)}
              className={
                "rounded-full px-3.5 py-1 text-xs transition " +
                (typeFilter === t
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {t === "all" ? "All" : t === "posts" ? "Posts" : "Comments"}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-card/60 p-1">
          {(["live", "hidden"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStateFilter(s)}
              className={
                "flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs transition " +
                (stateFilter === s
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted")
              }
            >
              {s === "live" ? (
                <Eye className="h-3.5 w-3.5" />
              ) : (
                <EyeOff className="h-3.5 w-3.5" />
              )}
              {s === "live" ? "Live" : "Hidden"}
            </button>
          ))}
        </div>
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, body, or reply…"
            className="h-9 pl-9"
            aria-label="Search content"
          />
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {/* Posts */}
        {includePosts &&
          (posts ?? []).map((p) => (
            <li
              key={`p-${p.id}`}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium uppercase tracking-[0.16em] text-foreground/70">
                      Story
                    </span>
                    {p.categories ? (
                      <>
                        <span aria-hidden>·</span>
                        <Link
                          to="/c/$slug"
                          params={{ slug: p.categories.slug }}
                          className="hover:text-foreground"
                        >
                          {p.categories.name}
                        </Link>
                      </>
                    ) : null}
                    <span aria-hidden>·</span>
                    <span>
                      {formatDistanceToNow(new Date(p.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                    {p.hidden_at && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center rounded-full bg-[var(--rose-soft)]/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--rose-deep)]">
                          Hidden
                        </span>
                      </>
                    )}
                  </div>
                  <Link
                    to="/post/$id"
                    params={{ id: p.id }}
                    className="mt-2 inline-block font-serif text-lg text-foreground hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {(p.body ?? "").slice(0, 280)}
                    {(p.body ?? "").length > 280 ? "…" : ""}
                  </p>
                  {p.hidden_reason && (
                    <p className="mt-3 rounded-lg border-l-2 border-[var(--rose-deep)]/30 bg-muted/40 p-3 text-xs">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        Hidden reason
                      </span>
                      <span className="mt-1 block text-foreground">
                        {p.hidden_reason}
                      </span>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  {!p.hidden_at ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        setHiding({
                          type: "post",
                          id: p.id,
                          title: p.title,
                        })
                      }
                    >
                      Hide
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setReinstating({
                          type: "post",
                          id: p.id,
                          title: p.title,
                        })
                      }
                    >
                      Reinstate
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}

        {/* Comments */}
        {includeComments &&
          (comments ?? []).map((c) => {
            const parentTitle = parentTitleById.get(c.post_id);
            return (
              <li
                key={`c-${c.id}`}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium uppercase tracking-[0.16em] text-foreground/70">
                        Reply
                      </span>
                      {parentTitle ? (
                        <>
                          <span aria-hidden>on</span>
                          <Link
                            to="/post/$id"
                            params={{ id: c.post_id }}
                            className="hover:text-foreground"
                          >
                            {parentTitle}
                          </Link>
                        </>
                      ) : null}
                      <span aria-hidden>·</span>
                      <span>
                        {formatDistanceToNow(new Date(c.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                      {c.hidden_at && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center rounded-full bg-[var(--rose-soft)]/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--rose-deep)]">
                            Hidden
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-foreground">
                      {(c.body ?? "").slice(0, 280)}
                      {(c.body ?? "").length > 280 ? "…" : ""}
                    </p>
                    {c.hidden_reason && (
                      <p className="mt-3 rounded-lg border-l-2 border-[var(--rose-deep)]/30 bg-muted/40 p-3 text-xs">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          Hidden reason
                        </span>
                        <span className="mt-1 block text-foreground">
                          {c.hidden_reason}
                        </span>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {!c.hidden_at ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() =>
                          setHiding({
                            type: "comment",
                            id: c.id,
                            title: (c.body ?? "").slice(0, 60),
                          })
                        }
                      >
                        Hide
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setReinstating({
                            type: "comment",
                            id: c.id,
                            title: (c.body ?? "").slice(0, 60),
                          })
                        }
                      >
                        Reinstate
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}

        {(posts?.length ?? 0) === 0 && (comments?.length ?? 0) === 0 && (
          <li className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No {stateFilter} content matching the current filters.
          </li>
        )}
      </ul>

      {/* Hide dialog */}
      <Dialog
        open={!!hiding}
        onOpenChange={(o) => {
          if (!o) {
            setHiding(null);
            setHideReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hide this {hiding?.type}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The reason is shown to the author if they visit their{" "}
            {hiding?.type === "post" ? "story" : "reply"}. Action is audit-logged.
          </p>
          {hiding && (
            <p className="mt-1 text-xs text-muted-foreground">
              Target: <span className="text-foreground">{hiding.title}</span>
            </p>
          )}
          <Input
            value={hideReason}
            onChange={(e) => setHideReason(e.target.value)}
            placeholder="Reason (visible to author)…"
            className="mt-1"
            maxLength={300}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setHiding(null);
                setHideReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitHide}
              disabled={!hideReason.trim()}
            >
              Hide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reinstate alert */}
      <AlertDialog
        open={!!reinstating}
        onOpenChange={(o) => !o && setReinstating(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reinstate content?</AlertDialogTitle>
            <AlertDialogDescription>
              This {reinstating?.type} becomes visible to the community again.
              Action is recorded in the admin audit log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitReinstate}>
              Reinstate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
