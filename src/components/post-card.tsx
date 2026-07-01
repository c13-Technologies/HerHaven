import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

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
  const author = post.is_anonymous
    ? { name: "Anonymous", username: null as string | null }
    : {
        name: post.profiles?.display_name ?? post.profiles?.username ?? "A sister",
        username: post.profiles?.username ?? null,
      };

  return (
    <article className="rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-sm">
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

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
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
        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
      </div>
    </article>
  );
}
