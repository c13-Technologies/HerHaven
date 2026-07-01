import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/post-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, Loader2 } from "lucide-react";

const PAGE_SIZE = 10;

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Search · Her Haven" }] }),
  component: SearchPage,
});

function SearchSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-7 w-4/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const loaderRef = useRef<HTMLDivElement>(null);

  // Debounce the search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["search", debouncedQuery, category],
    enabled: debouncedQuery.length >= 2 || category !== "all",
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      let q = supabase
        .from("posts")
        .select(
          "id, title, body, tag, is_anonymous, is_sensitive, created_at, category_slug, author_id, profiles:author_id(username, display_name, avatar_url)",
        )
        .is("circle_id", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (category !== "all") q = q.eq("category_slug", category);

      if (debouncedQuery.length >= 2) {
        q = q.or(`title.ilike.%${debouncedQuery}%,body.ilike.%${debouncedQuery}%`);
      }

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

  const clearSearch = () => {
    setQuery("");
    setDebouncedQuery("");
    setCategory("all");
  };

  const allPosts = data?.pages.flat() ?? [];
  const hasActiveFilters = debouncedQuery.length >= 2 || category !== "all";
  const showResults = hasActiveFilters && !isLoading;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <p className="eyebrow">Find stories</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
        Search the <span className="italic text-[var(--rose-deep)]">haven.</span>
      </h1>

      {/* Search bar + category filter */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by keyword…"
            className="h-11 pl-10 pr-10 rounded-full"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-11 rounded-full border border-input bg-background px-4 text-sm text-foreground sm:w-44"
        >
          <option value="all">All categories</option>
          <option value="relationships">Relationships</option>
          <option value="career">Career & Work</option>
          <option value="marriage">Marriage</option>
          <option value="motherhood">Motherhood</option>
          <option value="mental-wellness">Mental Wellness</option>
          <option value="personal-growth">Personal Growth</option>
          <option value="finance">Finance</option>
          <option value="friendship">Friendship</option>
          <option value="faith">Faith & Spirituality</option>
          <option value="lifestyle">Lifestyle</option>
          <option value="general">General</option>
        </select>
      </div>

      {/* Results */}
      <div className="mt-8 space-y-5">
        {isLoading && (
          <>
            <SearchSkeleton />
            <SearchSkeleton />
            <SearchSkeleton />
          </>
        )}

        {showResults && allPosts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center animate-in fade-in zoom-in duration-500">
            <p className="font-serif text-2xl text-foreground">Nothing found</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different keyword or category.
            </p>
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
              No more results.
            </p>
          )}
        </div>

        {!hasActiveFilters && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-serif text-2xl text-foreground">What are you looking for?</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Type a keyword or pick a category to start searching.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
