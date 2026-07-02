import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/lib/category-icons";

export const Route = createFileRoute("/_authenticated/c/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} · Her Haven` }] }),
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();

  const { data: category } = useQuery({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").eq("slug", slug).maybeSingle();
      return data;
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["category-posts", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, title, body, tag, is_anonymous, is_sensitive, created_at, category_slug, author_id, profiles:author_id(username, display_name, avatar_url)",
        )
        .eq("category_slug", slug)
        .is("circle_id", null)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as unknown as FeedPost[];
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link to="/categories" className="text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
        ← All categories
      </Link>
      <header className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--rose-soft)]/60 text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/20">
            <CategoryIcon slug={slug} className="h-7 w-7" />
          </span>
          <h1 className="mt-4 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            {category?.name ?? slug}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {category?.description}
          </p>
        </div>
        <Button asChild className="shrink-0 rounded-full">
          <Link to="/post/new" search={{ category: slug }}>Share here</Link>
        </Button>
      </header>

      <div className="mt-10 space-y-5">
        {posts && posts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-serif text-2xl text-foreground">No stories yet in this room.</p>
            <p className="mt-2 text-sm text-muted-foreground">Be the first.</p>
          </div>
        )}
        {posts?.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}
