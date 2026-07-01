import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Heart, Hand, Flag, Trash2 } from "lucide-react";
import { CommentCard, buildCommentTree, type CommentData, type CommentReactionMap } from "@/components/comment-card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/post/$id")({
  head: () => ({ meta: [{ title: "Story · Her Haven" }] }),
  component: PostPage,
});

const REACTIONS = [
  { type: "heart" as const, label: "Heart", Icon: Heart },
  { type: "hug" as const, label: "Hug", Icon: Hand },
];

function PostPage() {
  const { id } = Route.useParams();
  const { user, isModerator } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [anon, setAnon] = useState(false);
  const [acknowledgedSensitive, setAck] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const { data: post } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "*, profiles:author_id(username, display_name, avatar_url), categories:category_slug(name, slug, emoji)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as {
        id: string;
        author_id: string;
        title: string;
        body: string;
        tag: "general" | "need_advice" | "just_venting";
        is_anonymous: boolean;
        is_sensitive: boolean;
        created_at: string;
        category_slug: string;
        profiles?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
        categories?: { name: string; slug: string; emoji: string | null } | null;
      };
    },
  });

  const { data: comments } = useQuery({
    queryKey: ["comments", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, body, is_anonymous, created_at, author_id, parent_id, profiles:author_id(username, display_name, avatar_url)")
        .eq("post_id", id)
        .order("created_at");
      return (data ?? []) as unknown as Array<Omit<CommentData, "replies">>;
    },
  });

  const commentTree = comments ? buildCommentTree(comments) : [];

  const { data: reactions } = useQuery({
    queryKey: ["reactions", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reactions")
        .select("type, user_id")
        .eq("post_id", id);
      return data ?? [];
    },
  });

  // Fetch comment reactions for this post's comments
  const { data: commentReactions } = useQuery({
    queryKey: ["comment-reactions", id],
    enabled: !!comments && comments.length > 0,
    queryFn: async () => {
      const commentIds = comments!.map((c) => c.id);
      const { data } = await supabase
        .from("reactions")
        .select("type, user_id, comment_id")
        .in("comment_id", commentIds)
        .not("comment_id", "is", null);
      return (data as unknown as Array<{ type: string; user_id: string; comment_id: string }>) ?? [];
    },
  });

  // Build reaction map: comment_id → { counts, myTypes }
  const reactionMap: CommentReactionMap = {};
  if (commentReactions) {
    for (const r of commentReactions) {
      if (!reactionMap[r.comment_id]) {
        reactionMap[r.comment_id] = { counts: {}, myTypes: [] };
      }
      reactionMap[r.comment_id].counts[r.type] =
        (reactionMap[r.comment_id].counts[r.type] ?? 0) + 1;
      if (r.user_id === user?.id) {
        reactionMap[r.comment_id].myTypes.push(r.type);
      }
    }
  }

  const toggleCommentReaction = async (commentId: string, type: string) => {
    if (!user) return;
    const entry = reactionMap[commentId];
    const hasIt = entry?.myTypes.includes(type);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabase.from("reactions") as any;
    if (hasIt) {
      await table.delete().match({ comment_id: commentId, user_id: user.id, type });
    } else {
      await table.insert({ comment_id: commentId, user_id: user.id, type });
    }
    qc.invalidateQueries({ queryKey: ["comment-reactions", id] });
  };

  const counts: Record<string, number> = {};
  const mine = new Set<string>();
  for (const r of reactions ?? []) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (r.user_id === user?.id) mine.add(r.type);
  }

  const toggleReaction = async (type: "heart" | "hug") => {
    if (!user) return;
    if (mine.has(type)) {
      await supabase.from("reactions").delete().match({ post_id: id, user_id: user.id, type });
    } else {
      await supabase.from("reactions").insert({ post_id: id, user_id: user.id, type });
    }
    qc.invalidateQueries({ queryKey: ["reactions", id] });
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !comment.trim()) return;
    const { error } = await supabase.from("comments").insert({
      post_id: id,
      author_id: user.id,
      body: comment.trim(),
      is_anonymous: anon,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setComment("");
    qc.invalidateQueries({ queryKey: ["comments", id] });
    // notify post author (best effort)
    if (post && post.author_id !== user.id) {
      await supabase.from("notifications").insert({
        user_id: post.author_id,
        type: "reply",
        title: "Someone replied to your story",
        body: comment.trim().slice(0, 120),
        link: `/post/${id}`,
      }).then(() => {}, () => {});
    }
  };

  const submitReply = async (parentId: string, body: string, anonymous: boolean) => {
    if (!user) return;
    const { error } = await supabase.from("comments").insert({
      post_id: id,
      author_id: user.id,
      parent_id: parentId,
      body,
      is_anonymous: anonymous,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["comments", id] });
  };

  const deletePost = async () => {
    if (!confirm("Delete this story? This cannot be undone.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Story deleted.");
    navigate({ to: "/feed" });
  };

  const submitReport = async () => {
    if (!user || !reportReason.trim()) return;
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id,
      target_type: "post",
      target_id: id,
      reason: reportReason.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setReportOpen(false);
    setReportReason("");
    toast.success("Thank you. A moderator will review.");
  };

  if (!post) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        <p className="text-sm text-muted-foreground">Loading story…</p>
      </div>
    );
  }

  if (post.is_sensitive && !acknowledgedSensitive) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 text-center sm:px-8">
        <p className="eyebrow">Sensitive content</p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">
          This story may be hard to read.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The author marked this with a content warning. Open it only if you’re
          in a good place to receive it.
        </p>
        <Button className="mt-8 rounded-full" onClick={() => setAck(true)}>
          I’m ready to read it
        </Button>
      </div>
    );
  }

  const authorName = post.is_anonymous
    ? "Anonymous"
    : post.profiles?.display_name ?? post.profiles?.username ?? "A sister";

  const canDelete = user && (post.author_id === user.id || isModerator);

  return (
    <article className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <Link to="/feed" className="text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
        ← Back to the feed
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-xs">
        <span className="tag-chip">
          {post.tag === "need_advice" ? "Need advice" : post.tag === "just_venting" ? "Just venting" : "Story"}
        </span>
        <Link
          to="/c/$slug"
          params={{ slug: post.category_slug }}
          className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
        >
          {post.categories?.name ?? post.category_slug}
        </Link>
      </div>

      <h1 className="mt-4 font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
        {post.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>— {authorName}</span>
        <span>·</span>
        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
      </div>

      <div className="prose-paper mt-8 whitespace-pre-wrap font-serif text-lg leading-relaxed text-foreground">
        {post.body}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-2 border-y border-border py-4">
        {REACTIONS.map(({ type, Icon, label }) => (
          <button
            key={type}
            onClick={() => toggleReaction(type)}
            className={
              "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs transition " +
              (mine.has(type)
                ? "border-[var(--rose)] bg-[var(--rose-soft)] text-[var(--rose-deep)]"
                : "border-border text-muted-foreground hover:text-foreground")
            }
            aria-label={label}
          >
            <Icon className="h-3.5 w-3.5" />
            {counts[type] ?? 0}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Dialog open={reportOpen} onOpenChange={setReportOpen}>
            <DialogTrigger asChild>
              <button
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Report"
              >
                <Flag className="h-3.5 w-3.5" /> Report
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Report this story</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Tell a moderator why this story breaks the community rules.
              </p>
              <Input
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason"
                maxLength={300}
              />
              <DialogFooter>
                <Button onClick={submitReport} disabled={!reportReason.trim()}>
                  Send report
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {canDelete && (
            <button
              onClick={deletePost}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* Comments */}
      <section className="mt-10">
        <h2 className="font-serif text-2xl text-foreground">Replies</h2>

        <form onSubmit={submitComment} className="mt-5 rounded-2xl border border-border bg-card p-5">
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Be kind. Be real."
            rows={4}
            maxLength={2000}
          />
          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={anon} onCheckedChange={setAnon} />
              Reply anonymously
            </label>
            <Button type="submit" disabled={!comment.trim()} className="rounded-full">
              Send
            </Button>
          </div>
        </form>

        <div className="mt-8 space-y-3">
          {commentTree.map((node) => (
            <CommentCard
              key={node.id}
              comment={node}
              reactionMap={reactionMap}
              onToggleReaction={toggleCommentReaction}
              onSubmitReply={submitReply}
            />
          ))}
          {comments && comments.length === 0 && (
            <p className="text-sm text-muted-foreground">No replies yet. Be the first to listen.</p>
          )}
        </div>
      </section>
    </article>
  );
}
