import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact · Her Haven" },
      { name: "description", content: "Get in touch with the Her Haven team." },
      { property: "og:title", content: "Contact · Her Haven" },
      { property: "og:description", content: "Get in touch with the Her Haven team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">Say hello</p>
      <h1 className="mt-3 font-serif text-5xl font-light leading-tight tracking-tight text-foreground sm:text-6xl">
        We’d love to <span className="italic text-[var(--rose-deep)]">hear from you.</span>
      </h1>
      <p className="mt-5 text-base leading-relaxed text-muted-foreground">
        Questions, press, partnership, or a story about how Her Haven found you — write to us.
      </p>

      <div className="mt-10 space-y-5 rounded-2xl border border-border bg-card p-7">
        <div>
          <p className="eyebrow">General</p>
          <a href="mailto:hello@herhaven.app" className="mt-1 block font-serif text-2xl text-foreground hover:underline">
            hello@herhaven.app
          </a>
        </div>
        <div className="border-t border-border pt-5">
          <p className="eyebrow">Safety & moderation</p>
          <a href="mailto:safety@herhaven.app" className="mt-1 block font-serif text-2xl text-foreground hover:underline">
            safety@herhaven.app
          </a>
          <p className="mt-1 text-xs text-muted-foreground">For urgent reports, use the in-app report button.</p>
        </div>
      </div>
    </div>
  );
}
