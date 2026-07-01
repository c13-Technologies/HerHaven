import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
        .select("slug, name, description, emoji, ord")
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
            className="group rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <p className="font-serif text-3xl">{c.emoji}</p>
            <p className="mt-3 font-serif text-2xl text-foreground group-hover:underline">
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
