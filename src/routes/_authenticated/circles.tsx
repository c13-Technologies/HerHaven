import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/circles")({
  head: () => ({ meta: [{ title: "Support circles · Her Haven" }] }),
  component: CirclesPage,
});

function CirclesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [open, setOpen] = useState(false);

  const { data: circles } = useQuery({
    queryKey: ["circles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("circles")
        .select("id, name, description, is_private, created_by, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const create = async () => {
    if (!user || !name.trim()) return;
    const { data, error } = await supabase
      .from("circles")
      .insert({ name: name.trim(), description: desc.trim() || null, created_by: user.id, is_private: true })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("circle_members").insert({ circle_id: data.id, user_id: user.id, role: "admin" });
    setOpen(false);
    setName("");
    setDesc("");
    qc.invalidateQueries({ queryKey: ["circles"] });
    toast.success("Circle created.");
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Smaller tables</p>
          <h1 className="mt-2 truncate font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Support circles
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Private, invite-only groups for the conversations that need a smaller room.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="shrink-0 rounded-full">Start a circle</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a new circle</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className="mt-1.5" />
              </div>
              <div>
                <Label>What it’s for</Label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={300} className="mt-1.5" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={!name.trim()}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-10 space-y-4">
        {(circles ?? []).map((c) => (
          <Link
            key={c.id}
            to="/circles/$id"
            params={{ id: c.id }}
            className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-sm"
          >
            <div className="min-w-0">
              <p className="truncate font-serif text-xl text-foreground">{c.name}</p>
              {c.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
              )}
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.22em] text-[var(--rose-deep)]">
              {c.is_private ? "Private" : "Open"}
            </span>
          </Link>
        ))}
        {circles && circles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="font-serif text-2xl text-foreground">You’re not in any circles yet.</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start one for the conversation only a few should hear.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
