import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Bookmark, BookOpen } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export interface FeedPost {
  id: string;
  title: string;
  body: string;
  tag: "need_advice" | "just_venting" | "general";
  is_anonymous: boolean;
  is_sensitive: boolean;
  created_at: string;
  category_slug: string;
  author_id: string;
  profiles?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
}

const TAG_LABEL: Record<FeedPost["tag"], string> = {
  need_advice: "Need advice",
  just_venting: "Just venting",
  general: "Story",
};

const READING_WPM = 220;

function formatCategory(slug: string) {
  return slug
    .split("-")
    .map((s) => s[0]?.toUpperCase() + s.slice(1))
    .join(" ");
}

export function PostCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);
  const [confirmingSave, setConfirmingSave] = useState(false);
  const confirmTimerRef = useRef<number | null>(null);

  // Clear any pending bookmark-confirm timer on unmount (and on remount).
  useEffect(() => {
    return () => {
      if (confirmTimerRef.current !== null) {
        window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
      }
    };
  }, []);

  const readingMinutes = useMemo(
    () => Math.max(1, Math.round(post.body.split(/\s+/).filter(Boolean).length / READING_WPM)),
    [post.body],
  );

  const author = post.is_anonymous
    ? { name: "Anonymous", username: null as string | null, avatar: null as string | null }
    : {
        name: post.profiles?.display_name ?? post.profiles?.username ?? "A sister",
        username: post.profiles?.username ?? null,
        avatar: post.profiles?.avatar_url ?? null,
      };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((l) => !l);
    setLikeAnim(true);
    window.setTimeout(() => setLikeAnim(false), 500);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved((s) => !s);
    setSaveAnim(true);
    setConfirmingSave(true);

    // Reset the timer on rapid taps so the animation restarts cleanly each time.
    if (confirmTimerRef.current !== null) {
      window.clearTimeout(confirmTimerRef.current);
    }
    confirmTimerRef.current = window.setTimeout(() => {
      setSaveAnim(false);
      setConfirmingSave(false);
      confirmTimerRef.current = null;
    }, 600);
  };

  return (
    <article
      className={
        "group relative rounded-2xl border border-border bg-card p-6 transition-all duration-300 " +
        "hover:-translate-y-0.5 hover:border-[var(--rose)]/60 hover:shadow-[0_18px_40px_-20px_oklch(0.42_0.10_20_/_0.45)]"
      }
    >
      {/* corner bookmark */}
      <button
        type="button"
        onClick={handleSave}
        aria-label={saved ? "Unsave story" : "Save story"}
        className={
          "absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full transition-all duration-300 " +
          (saved
            ? "bg-[var(--rose-soft)] text-[var(--rose-deep)]"
            : "text-muted-foreground/60 hover:bg-muted hover:text-foreground") +
          (saveAnim ? " scale-125" : " scale-100")
        }
      >
        <Bookmark className={"h-4 w-4 " + (saved ? "fill-[var(--rose-deep)]" : "")} />
        {confirmingSave && <span aria-hidden="true" className="save-confirm-dot" />}
      </button>

      <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="tag-chip">{TAG_LABEL[post.tag]}</span>
        <span className="text-muted-foreground/40">·</span>
        <Link
          to="/c/$slug"
          params={{ slug: post.category_slug }}
          className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-[var(--rose-deep)]"
        >
          {formatCategory(post.category_slug)}
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <BookOpen className="h-3 w-3" />
          {readingMinutes} min read
        </span>
        {post.is_sensitive && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--rose-soft)]/60 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--rose-deep)]">
              sensitive
            </span>
          </>
        )}
      </header>

      <Link to="/post/$id" params={{ id: post.id }} className="mt-3 block pr-10">
        <h2 className="font-serif text-2xl leading-snug text-foreground transition-colors duration-300 group-hover:text-[var(--rose-deep)]">
          {post.title}
        </h2>
      </Link>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {post.body}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={handleLike}
            className={
              "group/like flex items-center gap-1.5 rounded-full px-2.5 py-1.5 transition-all duration-200 " +
              (liked
                ? "bg-[var(--rose-soft)] text-[var(--rose-deep)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground")
            }
            aria-label={liked ? "Unlike" : "Like"}
            aria-pressed={liked}
          >
            <Heart
              className={
                "h-4 w-4 transition-all duration-300 " +
                (liked ? "fill-[var(--rose-deep)]" : "") +
                (likeAnim ? " scale-125" : " scale-100")
              }
            />
            <span className="font-medium">{liked ? "Loved" : "Love"}</span>
          </button>
          <Link
            to="/post/$id"
            params={{ id: post.id }}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="font-medium">Reply</span>
          </Link>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            {author.avatar ? (
              <img
                src={author.avatar}
                alt=""
                className="h-6 w-6 rounded-full object-cover ring-1 ring-[var(--rose)]/40 ring-offset-1 ring-offset-card"
              />
            ) : (
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--rose-soft)] font-serif text-[11px] text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/40 ring-offset-1 ring-offset-card">
                {author.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="font-medium text-foreground/80">{author.name}</span>
            {!post.is_anonymous && author.username && (
              <Link
                to="/u/$username"
                params={{ username: author.username }}
                className="italic hover:text-foreground"
              >
                @{author.username}
              </Link>
            )}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </article>
  );
}
