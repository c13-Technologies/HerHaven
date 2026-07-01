import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  default_anonymous: boolean;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async (s: Session | null) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const [{ data: p }, { data: r }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", s.user.id).maybeSingle(),
          supabase.from("user_roles").select("role").eq("user_id", s.user.id),
        ]);
        if (cancelled) return;
        setProfile((p as Profile) ?? null);
        setRoles((r ?? []).map((x: { role: string }) => x.role));
      } else {
        setProfile(null);
        setRoles([]);
      }
      setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => load(s));

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    profile,
    roles,
    isAdmin: roles.includes("admin"),
    isModerator: roles.includes("moderator") || roles.includes("admin"),
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
    },
  };
}
