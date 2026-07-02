import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Loader2 } from "lucide-react";
import { ClickSparkle } from "@/components/click-sparkle";
import { CherryBlossoms } from "@/components/cherry-blossoms";

const TAGS = [
  { key: "all", label: "All stories" },
  { key: "need_advice", label: "Need advice" },
  { key: "just_venting", label: "Just venting" },
  { key: "general", label: "General" },
];

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Community feed · Her Haven" }] }),
  component: FeedPage,
});

function FeedSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-7 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

function FeedPage() {
  const [tag, setTag] = useState<string>("all");
  const loaderRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["feed", tag],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      let q = supabase
        .from("posts")
        .select(
          "id, title, body, tag, is_anonymous, is_sensitive, created_at, category_slug, author_id, profiles:author_id(username, display_name, avatar_url)",
        )
        .is("circle_id", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      if (tag !== "all") q = q.eq("tag", tag as "need_advice" | "just_venting" | "general");
      if (pageParam) q = q.lt("created_at", pageParam);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as FeedPost[];
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.created_at ?? undefined;
    },
    initialPageParam: undefined as string | undefined,
  });

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPosts = data?.pages.flat() ?? [];
  const isEmpty = !isLoading && allPosts.length === 0;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <CherryBlossoms />
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">The community feed</p>
          <h1 className="mt-2 truncate font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Today's stories
          </h1>
        </div>
        <ClickSparkle>
          <Button asChild className="shrink-0 rounded-full">
            <Link to="/post/new">
              <Plus className="mr-1 h-4 w-4" /> Share a story
            </Link>
          </Button>
        </ClickSparkle>
      </header>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {TAGS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTag(t.key)}
            className={
              "shrink-0 rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.18em] transition-all duration-200 " +
              (tag === t.key
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        {isLoading && (
          <>
            <FeedSkeleton />
            <FeedSkeleton />
            <FeedSkeleton />
          </>
        )}

        {isEmpty && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center animate-in fade-in zoom-in duration-500">
            <p className="font-serif text-2xl text-foreground">It's quiet here.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the first to share a story today.
            </p>
            <Button asChild className="mt-6 rounded-full">
              <Link to="/post/new">Write something</Link>
            </Button>
          </div>
        )}

        {allPosts.map((p, i) => (
          <div
            key={p.id}
            className="animate-in fade-in slide-in-from-bottom-4 duration-500"
            style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}
          >
            <PostCard post={p} />
          </div>
        ))}

        {/* Infinite scroll trigger */}
        <div ref={loaderRef} className="py-4 flex justify-center">
          {isFetchingNextPage && (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          )}
          {!hasNextPage && allPosts.length > 0 && (
            <p className="text-xs text-muted-foreground italic">
              You've reached the beginning of the feed.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
