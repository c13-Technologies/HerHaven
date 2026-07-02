import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CategoryIcon } from "@/lib/category-icons";

export const Route = createFileRoute("/_authenticated/categories")({
  head: () => ({ meta: [{ title: "Categories · Her Haven" }] }),
  component: CategoriesPage,
});

function CategoriesPage() {
  const { data } = useQuery({
    queryKey: ["categories-with-counts"],
    queryFn: async () => {
      const { data: cats, error } = await supabase
        .from("categories")
        .select("slug, name, description, ord")
        .order("ord");
      if (error) throw error;
      return cats;
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
      <p className="eyebrow">Conversations by season</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
        Eleven gentle rooms.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        Choose a room that fits today. You can always wander into another.
      </p>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((c) => (
          <Link
            key={c.slug}
            to="/c/$slug"
            params={{ slug: c.slug }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--rose)]/60 hover:shadow-[0_18px_40px_-20px_oklch(0.42_0.10_20_/_0.45)]"
          >
            <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[var(--rose-soft)]/40 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--rose-soft)]/60 text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/20 transition-colors duration-300 group-hover:bg-[var(--rose-soft)] group-hover:text-[var(--rose-deep)]">
              <CategoryIcon slug={c.slug} className="h-6 w-6" />
            </div>
            <p className="mt-4 font-serif text-2xl text-foreground group-hover:underline">
              {c.name}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {c.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
