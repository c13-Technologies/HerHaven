import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const searchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional().default("signin"),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in · Her Haven" },
      { name: "description", content: "Join Her Haven — a safe community for women." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode: initialMode, redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: (redirect as "/feed") ?? "/feed" });
    });
  }, [navigate, redirect]);

  const signInGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/feed",
      },
    });
    if (error) {
      toast.error("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = z
          .object({
            email: z.string().email(),
            password: z.string().min(8, "At least 8 characters"),
            displayName: z.string().min(1).max(60),
          })
          .safeParse({ email, password, displayName });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/feed",
            data: { display_name: displayName },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Welcome to Her Haven. Check your inbox to confirm.");
        navigate({ to: "/feed" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }
        navigate({ to: (redirect as "/feed") ?? "/feed" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] max-w-md flex-col justify-center px-5 py-16 sm:px-8">
      <div className="text-center">
        <p className="eyebrow">{mode === "signup" ? "Welcome in" : "Welcome back"}</p>
        <h1 className="mt-4 font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
          {mode === "signup" ? (
            <>Find your <span className="italic text-[var(--rose-deep)]">home.</span></>
          ) : (
            <>Sign in, <span className="italic text-[var(--rose-deep)]">sister.</span></>
          )}
        </h1>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card p-7 shadow-sm">
        <Button
          type="button"
          variant="outline"
          onClick={signInGoogle}
          disabled={loading}
          className="h-12 w-full rounded-full bg-transparent"
        >
          Continue with Google
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          or with email
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Name (or what to call you)</Label>
              <Input
                id="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Maya"
                maxLength={60}
                required
                className="mt-1.5 h-11"
              />
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 h-11"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1.5 h-11"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-12 w-full rounded-full">
            {loading ? "One moment…" : mode === "signup" ? "Create my account" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "signup" ? "Already a member?" : "New here?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
            className="text-foreground underline-offset-4 hover:underline"
          >
            {mode === "signup" ? "Sign in" : "Create an account"}
          </button>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By joining you agree to our{" "}
        <Link to="/rules" className="underline-offset-2 hover:underline">community rules</Link>.
      </p>
    </div>
  );
}
