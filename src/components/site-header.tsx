import { Link, useRouterState } from "@tanstack/react-router";
import { Menu, X, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/feed", label: "Feed" },
  { to: "/categories", label: "Categories" },
  { to: "/circles", label: "Circles" },
  { to: "/about", label: "About" },
];

export function SiteHeader() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
        {/* Logo — always on the left */}
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--rose-soft)] text-[var(--rose-deep)]">
            <span className="font-serif text-base italic">h</span>
          </span>
          <span className="font-serif text-lg tracking-tight text-foreground">
            Her Haven
          </span>
        </Link>

        {/* Desktop nav — fills remaining space, centered */}
        <nav className="ml-8 hidden flex-1 items-center justify-center gap-8 md:flex">
          {NAV.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={
                  active
                    ? "text-sm font-medium text-foreground"
                    : "text-sm text-muted-foreground transition hover:text-foreground"
                }
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/* Desktop theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-transparent text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {user ? (
            <>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
                >
                  Admin
                </Link>
              )}
              <Link
                to="/notifications"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Notifications
              </Link>
              <Link
                to="/me"
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-muted font-serif text-sm text-foreground">
                  {(profile?.display_name ?? profile?.username ?? "?")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              </Link>
              <button
                onClick={signOut}
                className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/auth"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Link>
              <Button asChild className="rounded-full">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Join Her Haven
                </Link>
              </Button>
            </>
          )}
        </div>

        {/* Spacer — pushes mobile buttons to the right */}
        <div className="flex-1 md:hidden" />

        {/* Mobile: theme toggle + hamburger, grouped on the right */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-transparent text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-10 w-10 place-items-center rounded-full border border-border"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                {n.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" />
            {user ? (
              <>
                <Link
                  to="/me"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  My profile
                </Link>
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Notifications
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => {
                    setOpen(false);
                    signOut();
                  }}
                  className="rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground"
                >
                  Join Her Haven
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
