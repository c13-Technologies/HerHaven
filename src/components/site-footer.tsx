import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/logo.jpg"
                alt="Her Haven"
                className="h-8 w-8 rounded-full object-cover"
              />
              <p className="font-serif text-2xl tracking-tight text-foreground">
                Her Haven
              </p>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A quiet, supportive corner of the internet for women to share
              stories, ask hard questions, and grow together.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <p className="eyebrow">Explore</p>
            <Link to="/feed" className="block text-muted-foreground hover:text-foreground">Community feed</Link>
            <Link to="/categories" className="block text-muted-foreground hover:text-foreground">Categories</Link>
            <Link to="/circles" className="block text-muted-foreground hover:text-foreground">Support circles</Link>
          </div>

          <div className="space-y-2 text-sm">
            <p className="eyebrow">Haven</p>
            <Link to="/about" className="block text-muted-foreground hover:text-foreground">About</Link>
            <Link to="/rules" className="block text-muted-foreground hover:text-foreground">Community rules</Link>
            <Link to="/contact" className="block text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Her Haven. Made with care.</p>
          <p className="italic">For every woman, in every season.</p>
        </div>
      </div>
    </footer>
  );
}
