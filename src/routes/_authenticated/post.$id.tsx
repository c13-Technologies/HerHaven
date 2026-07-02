import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Heart, Hand, Flag, Trash2, Twitter, Facebook, Linkedin, Link2, Check } from "lucide-react";
import { CommentCard, buildCommentTree, type CommentData, type CommentReactionMap } from "@/components/comment-card";
import { useFloatingHearts } from "@/components/floating-hearts";
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
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const { ref: heartsRef, burst: burstHearts } = useFloatingHearts();

  const { data: post } = useQuery({
    queryKey: ["post", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "*, profiles:author_id(username, display_name, avatar_url), categories:category_slug(name, slug)",
        )
        .eq("id", id)
        .maybeSingle();
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
        hidden_at: string | null;
        hidden_by: string | null;
        hidden_reason: string | null;
        profiles?: { username: string | null; display_name: string | null; avatar_url: string | null } | null;
        categories?: { name: string; slug: string } | null;
      } | null;
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
    if (type === "heart") burstHearts();
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
      <div className="mx-auto max-w-2xl px-5 py-16 text-center sm:px-8">
        <p className="eyebrow">Story</p>
        <h1 className="mt-3 font-serif text-3xl text-foreground">
          This story is no longer available.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          It may have been hidden by a moderator, deleted, or never existed.
        </p>
        <Link
          to="/feed"
          className="mt-8 inline-block text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
        >
          ← Back to the feed
        </Link>
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

  // Authors always see their own posts through the new RLS. If the post
  // is hidden, show a soft banner so the author knows it was removed.
  const isAuthor = !!user && post.author_id === user.id;
  const isHiddenFromCommunity = !!post.hidden_at;
  const showAuthorRemovalBanner = isAuthor && isHiddenFromCommunity;

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

      {showAuthorRemovalBanner && (
        <div
          role="status"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--rose)]/40 bg-[var(--rose-soft)]/30 p-4 text-sm"
        >
          <span aria-hidden className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--rose-deep)]" />
          <div className="min-w-0">
            <p className="font-serif text-base text-foreground">
              Removed by a moderator
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              This story is no longer visible to the community.{" "}
              {post.hidden_reason ? (
                <>
                  Reason: <span className="text-foreground">{post.hidden_reason}</span>.
                </>
              ) : (
                <>No reason was given.</>
              )}
            </p>
          </div>
        </div>
      )}

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

      <div className="mt-10 flex flex-wrap items-center gap-2 border-y border-border py-4" ref={heartsRef}>
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

      {/* Share */}
      <div className="flex items-center gap-3 border-b border-border py-4">
        <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Share this story</span>
        <div className="flex items-center gap-1">
          {[
            {
              icon: Twitter,
              label: "Twitter",
              href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(shareUrl)}`,
            },
            {
              icon: Facebook,
              label: "Facebook",
              href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
            },
            {
              icon: Linkedin,
              label: "LinkedIn",
              href: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(post.title)}`,
            },
            {
              svg: true,
              label: "WhatsApp",
              href: `https://wa.me/?text=${encodeURIComponent(post.title + " " + shareUrl)}`,
            },
          ].map(({ icon: Icon, svg, label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share on ${label}`}
              className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-[var(--rose-deep)] hover:text-[var(--rose-deep)]"
            >
              {svg ? (
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              ) : (
                Icon && <Icon className="h-3.5 w-3.5" />
              )}
            </a>
          ))}
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            aria-label="Copy link"
            className="grid h-8 w-8 place-items-center rounded-full border border-border text-muted-foreground transition hover:border-[var(--rose-deep)] hover:text-[var(--rose-deep)]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Link2 className="h-3.5 w-3.5" />}
          </button>
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
