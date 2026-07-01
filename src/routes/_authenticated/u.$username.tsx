import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PostCard, type FeedPost } from "@/components/post-card";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} · Her Haven` }] }),
  component: UserProfile,
});

function UserProfile() {
  const { username } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["u", username],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      return data;
    },
  });

  const { data: posts } = useQuery({
    queryKey: ["u-posts", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("posts")
        .select(
          "id, title, body, tag, is_anonymous, is_sensitive, created_at, category_slug, author_id, profiles:author_id(username, display_name, avatar_url)",
        )
        .eq("author_id", profile!.id)
        .eq("is_anonymous", false)
        .is("circle_id", null)
        .order("created_at", { ascending: false });
      return (data ?? []) as unknown as FeedPost[];
    },
  });

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8">
        <p className="text-sm text-muted-foreground">Profile not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
      <p className="eyebrow">Member</p>
      <h1 className="mt-2 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
        {profile.display_name ?? profile.username}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
      {profile.bio && (
        <p className="mt-4 max-w-xl text-base leading-relaxed text-foreground">{profile.bio}</p>
      )}

      <h2 className="mt-12 font-serif text-2xl text-foreground">Stories</h2>
      <div className="mt-5 space-y-5">
        {posts && posts.length === 0 && (
          <p className="text-sm text-muted-foreground">No public stories yet.</p>
        )}
        {posts?.map((p) => <PostCard key={p.id} post={p} />)}
      </div>
    </div>
  );
}
