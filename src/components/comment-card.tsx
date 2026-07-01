import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Heart, Hand, MessageCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export interface CommentData {
  id: string;
  body: string;
  is_anonymous: boolean;
  created_at: string;
  author_id: string;
  parent_id: string | null;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  replies: CommentData[];
}

export interface CommentReactionMap {
  [commentId: string]: {
    counts: Record<string, number>;
    myTypes: string[];
  };
}

interface CommentCardProps {
  comment: CommentData;
  depth?: number;
  reactionMap: CommentReactionMap;
  onToggleReaction: (commentId: string, type: string) => Promise<void>;
  onSubmitReply: (parentId: string, body: string, anonymous: boolean) => Promise<void>;
}

const REACTIONS = [
  { key: "heart", Icon: Heart, label: "Heart" },
  { key: "hug", Icon: Hand, label: "Hug" },
] as const;

export function CommentCard({
  comment,
  depth = 0,
  reactionMap,
  onToggleReaction,
  onSubmitReply,
}: CommentCardProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyAnon, setReplyAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const hasReplies = comment.replies.length > 0;
  const entry = reactionMap[comment.id];
  const counts = entry?.counts ?? {};
  const myTypes = entry?.myTypes ?? [];

  const authorName = comment.is_anonymous
    ? "Anonymous"
    : comment.profiles?.display_name ??
      comment.profiles?.username ??
      "A sister";

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      await onSubmitReply(comment.id, replyBody.trim(), replyAnon);
      setReplyBody("");
      setReplyAnon(false);
      setShowReplyForm(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="group/thread">
      {/* Comment card */}
      <div
        className={`rounded-2xl border border-border bg-card p-5 transition ${
          depth > 0 ? "border-l-2 border-l-[var(--rose-soft)]" : ""
        }`}
        style={{ marginLeft: depth > 0 ? `${Math.min(depth * 20, 48)}px` : undefined }}
      >
        {/* Author + time */}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 min-w-0">
            {hasReplies && (
              <button
                onClick={() => setCollapsed((c) => !c)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition"
                aria-label={collapsed ? "Expand replies" : "Collapse replies"}
              >
                {collapsed ? (
                  <ChevronRight className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            <span className="truncate font-medium text-foreground">
              {authorName}
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline shrink-0">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>
          <span className="shrink-0 sm:hidden text-[10px]">
            {formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Body */}
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {comment.body}
        </p>

        {/* Reactions + Reply button */}
        <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
          {REACTIONS.map(({ key, Icon, label }) => (
            <button
              key={key}
              onClick={() => onToggleReaction(comment.id, key)}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition ${
                myTypes.includes(key)
                  ? "bg-[var(--rose-soft)] text-[var(--rose-deep)]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              aria-label={label}
            >
              <Icon
                className={`h-3 w-3 transition ${
                  myTypes.includes(key) ? "fill-[var(--rose-deep)]" : ""
                }`}
              />
              {(counts[key] ?? 0) > 0 && (
                <span className="tabular-nums">{counts[key]}</span>
              )}
            </button>
          ))}
          <button
            onClick={() => setShowReplyForm((s) => !s)}
            className={`ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] transition ${
              showReplyForm
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <MessageCircle className="h-3 w-3" />
            Reply
          </button>
        </div>

        {/* Inline reply form */}
        {showReplyForm && (
          <form onSubmit={handleReply} className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply…"
              rows={3}
              maxLength={2000}
              className="text-sm"
              autoFocus
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Switch checked={replyAnon} onCheckedChange={setReplyAnon} />
                Anonymous
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowReplyForm(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={!replyBody.trim() || submitting}
                  className="h-8 rounded-full text-xs"
                >
                  {submitting ? "Sending…" : "Reply"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Nested replies */}
      {hasReplies && !collapsed && (
        <div className="space-y-3 pt-3">
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              reactionMap={reactionMap}
              onToggleReaction={onToggleReaction}
              onSubmitReply={onSubmitReply}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Builds a tree from flat comments by linking parent_id */
export function buildCommentTree(flat: Omit<CommentData, "replies">[]): CommentData[] {
  const map = new Map<string, CommentData>();
  const roots: CommentData[] = [];

  // First pass: create nodes
  for (const c of flat) {
    map.set(c.id, { ...c, replies: [] });
  }

  // Second pass: link children to parents
  for (const c of flat) {
    const node = map.get(c.id)!;
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}
