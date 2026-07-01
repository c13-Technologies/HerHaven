import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle } from "lucide-react";
import { useState } from "react";

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

export function PostCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(false);
  const [animating, setAnimating] = useState(false);
  
  const author = post.is_anonymous
    ? { name: "Anonymous", username: null as string | null }
    : {
        name: post.profiles?.display_name ?? post.profiles?.username ?? "A sister",
        username: post.profiles?.username ?? null,
      };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLiked((l) => !l);
    setAnimating(true);
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <article className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-muted-foreground/20">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="tag-chip">{TAG_LABEL[post.tag]}</span>
        <Link
          to="/c/$slug"
          params={{ slug: post.category_slug }}
          className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground"
        >
          {post.category_slug.replace(/-/g, " ")}
        </Link>
        {post.is_sensitive && (
          <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--rose-deep)]">
            · sensitive
          </span>
        )}
      </div>

      <Link to="/post/$id" params={{ id: post.id }} className="mt-3 block">
        <h2 className="font-serif text-2xl leading-snug text-foreground hover:underline">
          {post.title}
        </h2>
      </Link>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {post.body}
      </p>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1.5 text-xs transition-all duration-200 ${
              liked
                ? "text-[var(--rose-deep)]"
                : "text-muted-foreground hover:text-[var(--rose)]"
            }`}
            aria-label={liked ? "Unlike" : "Like"}
          >
            <Heart
              className={`h-4 w-4 transition-all duration-300 ${
                liked ? "fill-[var(--rose-deep)]" : ""
              } ${animating ? "scale-125" : "scale-100"}`}
            />
            <span>{liked ? "Loved" : "Love"}</span>
          </button>
          <Link
            to="/post/$id"
            params={{ id: post.id }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageCircle className="h-4 w-4" />
            <span>Reply</span>
          </Link>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            — {author.name}
            {!post.is_anonymous && author.username && (
              <Link
                to="/u/$username"
                params={{ username: author.username }}
                className="ml-1 italic hover:text-foreground"
              >
                @{author.username}
              </Link>
            )}
          </span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
        </div>
      </div>
    </article>
  );
}
