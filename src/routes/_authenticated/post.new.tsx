import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getJournalPrompt } from "@/lib/ai.functions";

const searchSchema = z.object({ category: z.string().optional() });

export const Route = createFileRoute("/_authenticated/post/new")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Share a story · Her Haven" }] }),
  component: NewPostPage,
});

function NewPostPage() {
  const { category: initialCategory } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(initialCategory ?? "general");
  const [tag, setTag] = useState<"general" | "need_advice" | "just_venting">("general");
  const [anonymous, setAnonymous] = useState(profile?.default_anonymous ?? false);
  const [sensitive, setSensitive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("ord");
      return data ?? [];
    },
  });

  const inspire = async () => {
    setAiLoading(true);
    try {
      const res = await getJournalPrompt({ data: { mood: tag } });
      if (!body.trim()) setBody(res.prompt + "\n\n");
      else setBody(body + "\n\n" + res.prompt + "\n\n");
      toast.success("A prompt to start you off.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Try again in a moment";
      toast.error(`AI prompt unavailable — ${msg}`);
    } finally {
      setAiLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = z
      .object({
        title: z.string().trim().min(4, "Give it a title (4+ characters)").max(140),
        body: z.string().trim().min(20, "Share a little more (20+ characters)").max(8000),
      })
      .safeParse({ title, body });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .insert({
        author_id: user.id,
        title: parsed.data.title,
        body: parsed.data.body,
        category_slug: category,
        tag,
        is_anonymous: anonymous,
        is_sensitive: sensitive,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Your story is shared.");
    qc.invalidateQueries({ queryKey: ["feed"] });
    navigate({ to: "/post/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <p className="eyebrow">Share a story</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
        Write it <span className="italic text-[var(--rose-deep)]">honestly.</span>
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
        You can post as yourself or anonymously. Either way, this is a kind room.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What’s on your heart?"
            maxLength={140}
            className="mt-1.5 h-12 font-serif text-lg"
            required
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories?.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.emoji} {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Tag</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {(["general", "need_advice", "just_venting"] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTag(t)}
                  className={
                    "rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition " +
                    (tag === t
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  {t === "general" ? "Story" : t === "need_advice" ? "Advice" : "Venting"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="body">Your story</Label>
            <button
              type="button"
              onClick={inspire}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 text-xs text-[var(--rose-deep)] hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading ? "Thinking…" : "Inspire me"}
            </button>
          </div>
          <Textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Take your time."
            rows={12}
            className="mt-1.5 leading-relaxed"
            required
          />
        </div>

        <div className="flex flex-col gap-4 border-t border-border pt-5">
          <label className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Post anonymously</p>
              <p className="text-xs text-muted-foreground">
                Your name and profile will be hidden on this story.
              </p>
            </div>
            <Switch checked={anonymous} onCheckedChange={setAnonymous} />
          </label>
          <label className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Mark as sensitive</p>
              <p className="text-xs text-muted-foreground">
                Adds a gentle content warning before the story opens.
              </p>
            </div>
            <Switch checked={sensitive} onCheckedChange={setSensitive} />
          </label>
        </div>

        <Button type="submit" disabled={loading} className="h-12 w-full rounded-full">
          {loading ? "Sharing…" : "Share with the community"}
        </Button>
      </form>
    </div>
  );
}
