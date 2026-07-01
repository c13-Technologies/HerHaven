import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const TAGS = [
  { key: "all", label: "All stories" },
  { key: "need_advice", label: "Need advice" },
  { key: "just_venting", label: "Just venting" },
  { key: "general", label: "General" },
];

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Community feed · Her Haven" }] }),
  component: FeedPage,
});

function FeedPage() {
  const [tag, setTag] = useState<string>("all");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["feed", tag],
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select(
          "id, title, body, tag, is_anonymous, is_sensitive, created_at, category_slug, author_id, profiles:author_id(username, display_name, avatar_url)",
        )
        .is("circle_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (tag !== "all") q = q.eq("tag", tag as "need_advice" | "just_venting" | "general");
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as FeedPost[];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">The community feed</p>
          <h1 className="mt-2 truncate font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Today’s stories
          </h1>
        </div>
        <Button asChild className="shrink-0 rounded-full">
          <Link to="/post/new">
            <Plus className="mr-1 h-4 w-4" /> Share a story
          </Link>
        </Button>
      </header>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {TAGS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTag(t.key)}
            className={
              "shrink-0 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.18em] transition " +
              (tag === t.key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">Loading stories…</p>
        )}
        {posts && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-serif text-2xl text-foreground">It’s quiet here.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to share a story today.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/post/new">Write something</Link>
            </Button>
          </div>
        )}
        {posts?.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}
