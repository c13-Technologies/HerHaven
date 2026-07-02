import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { SkeletonCard, SkeletonBar } from "@/components/skeleton-card";
import { Plus, Loader2, BookOpen, PenLine } from "lucide-react";
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
    <SkeletonCard className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <SkeletonBar className="h-5 w-20 rounded-full" />
          <SkeletonBar className="h-4 w-16 rounded-full" />
        </div>
        <SkeletonBar className="h-7 w-4/5" />
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-3/4" />
        <SkeletonBar className="h-4 w-full" />
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <SkeletonBar className="h-4 w-24" />
          <SkeletonBar className="h-4 w-20" />
        </div>
      </div>
    </SkeletonCard>
  );
}

function FeedPage() {
  const [tag, setTag] = useState<string>("all");
  const loaderRef = useRef<HTMLDivElement>(null);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
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
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
      <CherryBlossoms />

      {/* Hero */}
      <header className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-[var(--rose-soft)]/40 px-6 py-10 sm:px-10 sm:py-14">
        <div
          aria-hidden
          className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[var(--rose-soft)]/60 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -bottom-16 -left-10 h-56 w-56 rounded-full bg-[var(--peach)]/40 blur-3xl"
        />
        <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <p className="eyebrow">The community feed</p>
            <p className="mt-1 text-xs italic text-muted-foreground">
              {format(new Date(), "EEEE, MMMM d")}
            </p>
            <h1 className="mt-3 font-serif text-4xl font-light leading-[1.05] tracking-tight text-foreground sm:text-5xl">
              Today's <span className="italic text-[var(--rose-deep)]">stories.</span>
            </h1>
          </div>
          <ClickSparkle>
            <Button asChild className="shrink-0 h-11 rounded-full px-5 shadow-sm">
              <Link to="/post/new">
                <Plus className="mr-1.5 h-4 w-4" /> Share a story
              </Link>
            </Button>
          </ClickSparkle>
        </div>
      </header>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {TAGS.map((t) => {
          const active = tag === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTag(t.key)}
              aria-pressed={active}
              className={
                "shrink-0 rounded-full px-5 py-2 text-xs uppercase tracking-[0.18em] transition-all duration-300 " +
                (active
                  ? "bg-[var(--rose-deep)] text-white shadow-[0_4px_18px_-6px_oklch(0.42_0.10_20_/_0.7)]"
                  : "border border-border text-muted-foreground hover:border-[var(--rose)]/60 hover:text-foreground hover:shadow-sm")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-8 space-y-5">
        {isLoading && (
          <>
            <FeedSkeleton />
            <FeedSkeleton />
            <FeedSkeleton />
          </>
        )}

        {isError && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
            <p className="font-serif text-xl text-foreground">
              We couldn’t load the feed.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Something went wrong talking to the database. Try again in a moment.
            </p>
            {error instanceof Error && (
              <p className="mt-1 text-xs text-muted-foreground/70 italic hidden">
                {error.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                console.error("Feed query failed:", error);
                refetch();
              }}
              className="mt-5 rounded-full"
            >
              Try again
            </Button>
          </div>
        )}

        {isEmpty && !isError && (
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-[var(--rose)]/40 bg-gradient-to-br from-[var(--rose-soft)]/40 via-card to-[var(--peach)]/30 p-12 text-center animate-in fade-in zoom-in duration-500">
            <div
              aria-hidden
              className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--rose)]/15 blur-3xl"
            />
            <div className="relative mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--rose-soft)]/80 shadow-inner">
              <BookOpen className="h-5 w-5 text-[var(--rose-deep)]" />
            </div>
            <p className="relative mt-5 font-serif text-3xl text-foreground">
              It’s quiet here.
            </p>
            <p className="relative mx-auto mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
              No stories have landed yet — yours could be the first to open today’s conversation.
            </p>
            <ClickSparkle>
              <Button asChild className="relative mt-7 h-11 rounded-full px-6">
                <Link to="/post/new">
                  <PenLine className="mr-2 h-4 w-4" /> Write something
                </Link>
              </Button>
            </ClickSparkle>
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
