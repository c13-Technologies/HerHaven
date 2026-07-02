import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type SocialLinks } from "@/hooks/use-auth";
import { AvatarUploader } from "@/components/avatar-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PostCard, type FeedPost } from "@/components/post-card";
import { toast } from "sonner";
import { Globe, Twitter, Instagram, Linkedin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/me")({
  head: () => ({ meta: [{ title: "My profile · Her Haven" }] }),
  component: MePage,
});

function MePage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [anon, setAnon] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setUsername(profile.username ?? "");
      setBio(profile.bio ?? "");
      setAnon(profile.default_anonymous);
      setAvatarUrl(profile.avatar_url ?? null);
      setSocialLinks(profile.social_links ?? {});
    }
  }, [profile]);

  const { data: posts } = useQuery({
    queryKey: ["my-posts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(
          "id, title, body, tag, is_anonymous, is_sensitive, created_at, category_slug, author_id, profiles:author_id(username, display_name, avatar_url)",
        )
        .eq("author_id", user!.id)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as FeedPost[];
    },
  });

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const cleaned: SocialLinks = {};
    for (const [k, v] of Object.entries(socialLinks)) {
      if (v && v.trim()) cleaned[k as keyof SocialLinks] = v.trim();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("profiles") as any)
      .update({
        display_name: displayName.trim() || null,
        username: username.trim().toLowerCase() || null,
        bio: bio.trim() || null,
        default_anonymous: anon,
        social_links: Object.keys(cleaned).length > 0 ? cleaned : null,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Saved.");
    qc.invalidateQueries();
  };

  const handleAvatarUploaded = (url: string) => {
    setAvatarUrl(url);
    qc.invalidateQueries();
  };

  const handleAvatarRemoved = async () => {
    if (!user) return;
    // Delete from storage if we have a URL to parse
    if (avatarUrl) {
      try {
        const url = new URL(avatarUrl);
        const pathMatch = url.pathname.match(/\/avatars\/(.+)$/);
        if (pathMatch) {
          await supabase.storage.from("avatars").remove([pathMatch[1]]);
        }
      } catch {
        // Silently ignore storage deletion failures
      }
    }
    await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id);
    setAvatarUrl(null);
    qc.invalidateQueries();
    toast.success("Avatar removed.");
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      {/* Header with avatar */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
        {user && (
          <AvatarUploader
            userId={user.id}
            currentUrl={avatarUrl}
            onUploaded={handleAvatarUploaded}
            onRemoved={handleAvatarRemoved}
          />
        )}
        <div className="text-center sm:text-left">
          <p className="eyebrow">My profile</p>
          <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            {profile?.display_name ?? "You"}
          </h1>
          {username && (
            <p className="mt-1 text-sm text-muted-foreground">@{username}</p>
          )}
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 className="font-serif text-xl text-foreground">Settings</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Display name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1.5" />
          </div>
        </div>
        <div className="mt-4">
          <Label>Bio</Label>
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className="mt-1.5" maxLength={280} />
        </div>
        {/* Social links */}
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-3 font-serif text-base text-foreground">Social links</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ["website", Globe, "Your website", "https://yoursite.com"],
              ["twitter", Twitter, "Twitter / X", "https://x.com/yourhandle"],
              ["instagram", Instagram, "Instagram", "https://instagram.com/yourhandle"],
              ["linkedin", Linkedin, "LinkedIn", "https://linkedin.com/in/yourhandle"],
            ] as const).map(([key, Icon, label, placeholder]) => (
              <div key={key} className="relative">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                <div className="relative mt-1">
                  <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={socialLinks[key] ?? ""}
                    onChange={(e) =>
                      setSocialLinks((p) => ({ ...p, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="pl-9"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <label className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-5">
          <div>
            <p className="text-sm font-medium text-foreground">Post anonymously by default</p>
            <p className="text-xs text-muted-foreground">You can still flip it off on any post.</p>
          </div>
          <Switch checked={anon} onCheckedChange={setAnon} />
        </label>
        <Button onClick={save} disabled={saving} className="mt-6 rounded-full">
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </section>

      <section className="mt-12">
        <h2 className="font-serif text-2xl text-foreground">Your stories</h2>
        <div className="mt-5 space-y-5">
          {posts && posts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              You haven’t shared anything yet.{" "}
              <Link to="/post/new" className="underline">Write your first story.</Link>
            </p>
          )}
          {posts?.map((p) => <PostCard key={p.id} post={p} />)}
        </div>
      </section>
    </div>
  );
}
