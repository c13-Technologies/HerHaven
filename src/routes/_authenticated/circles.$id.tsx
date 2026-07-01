import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PostCard, type FeedPost } from "@/components/post-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/circles/$id")({
  head: () => ({ meta: [{ title: "Circle · Her Haven" }] }),
  component: CirclePage,
});

function CirclePage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: circle } = useQuery({
    queryKey: ["circle", id],
    queryFn: async () => {
      const { data } = await supabase.from("circles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["circle-posts", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(
          "id, title, body, tag, is_anonymous, is_sensitive, created_at, category_slug, author_id, profiles:author_id(username, display_name, avatar_url)",
        )
        .eq("circle_id", id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as FeedPost[];
    },
  });

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !body.trim()) return;
    const { error } = await supabase.from("posts").insert({
      author_id: user.id,
      title: title.trim(),
      body: body.trim(),
      category_slug: "general",
      circle_id: id,
      tag: "general",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setTitle("");
    setBody("");
    qc.invalidateQueries({ queryKey: ["circle-posts", id] });
    toast.success("Shared with your circle.");
  };

  if (!circle) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8">
        <p className="text-sm text-muted-foreground">This circle is private or doesn’t exist.</p>
        <Link to="/circles" className="mt-4 inline-block text-sm underline">Back to circles</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <Link to="/circles" className="text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground">
        ← All circles
      </Link>
      <p className="mt-4 eyebrow">{circle.is_private ? "Private circle" : "Open circle"}</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
        {circle.name}
      </h1>
      {circle.description && (
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{circle.description}</p>
      )}

      <form onSubmit={post} className="mt-10 space-y-3 rounded-2xl border border-border bg-card p-5">
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5" maxLength={140} />
        </div>
        <div>
          <Label>Share with your circle</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} className="mt-1.5" />
        </div>
        <Button type="submit" disabled={!title.trim() || !body.trim()} className="rounded-full">
          Share
        </Button>
      </form>

      <div className="mt-10 space-y-5">
        {posts?.map((p) => <PostCard key={p.id} post={p} />)}
        {posts && posts.length === 0 && (
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        )}
      </div>
    </div>
  );
}
