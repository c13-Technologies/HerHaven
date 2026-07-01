import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Her Haven — A safe space for women to share, heal and grow" },
      {
        name: "description",
        content:
          "Her Haven is a warm community where women share stories about relationships, career, motherhood, mental wellness, faith and personal growth — anonymously or as yourself.",
      },
      { property: "og:title", content: "Her Haven" },
      {
        property: "og:description",
        content:
          "A safe, supportive digital community for women to share, ask, listen and grow.",
      },
    ],
  }),
  component: LandingPage,
});

const CATEGORIES = [
  { name: "Relationships", note: "Nurturing bonds" },
  { name: "Wellness", note: "Mind & soul" },
  { name: "Motherhood", note: "Shared journeys" },
  { name: "Growth", note: "Personal path" },
  { name: "Career", note: "Ambition, honestly" },
  { name: "Faith", note: "Belief & meaning" },
  { name: "Friendship", note: "Chosen sisters" },
  { name: "Finance", note: "Money openly" },
];

const FEED_PEEK = [
  {
    tag: "Need advice",
    category: "Relationships",
    title: "He says I’m too sensitive. I don’t know if I am anymore.",
    excerpt:
      "Three years in and every time I bring up something that hurt me, the conversation becomes about how I said it. I’m starting to lose my own voice…",
    author: "Anonymous",
    hugs: 248,
    replies: 86,
  },
  {
    tag: "Just venting",
    category: "Motherhood",
    title: "I love my baby and I miss who I was. Both can be true.",
    excerpt:
      "Nobody warned me how much I’d grieve the woman I was before her. I’d do it all again. But today I needed to say this out loud somewhere safe.",
    author: "Anonymous",
    hugs: 412,
    replies: 137,
  },
  {
    tag: "Need advice",
    category: "Career",
    title: "Asking for the raise I’ve earned — what would you say?",
    excerpt:
      "I’ve led the last two product launches and I’m still the lowest-paid person on my team. The meeting is on Monday. Tell me what to actually say.",
    author: "Maya",
    hugs: 91,
    replies: 54,
  },
];

function LandingPage() {
  return (
    <div className="bg-background">
      {/* HERO */}
      <section className="px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--rose)]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              A sacred space for stories
            </span>
          </div>

          <h1 className="mt-8 font-serif text-5xl font-light leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            Find your home in
            <br />
            <span className="italic text-[var(--rose-deep)]">every season.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
            A safe, supportive digital community where women share stories about
            relationships, career, motherhood, mental wellness, faith and the
            quiet work of becoming.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Button asChild size="lg" className="h-14 rounded-full px-10 text-sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Join Her Haven
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 rounded-full border-border bg-transparent px-10 text-sm"
            >
              <Link to="/feed">Explore the community</Link>
            </Button>
          </div>

          {/* Categories preview */}
          <div className="mt-20 w-full border-t border-border/70 pt-12">
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 text-left sm:grid-cols-4">
              {CATEGORIES.slice(0, 4).map((c) => (
                <div key={c.name}>
                  <p className="font-serif text-2xl text-foreground">{c.name}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {c.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY STRIP */}
      <section className="border-y border-border bg-[var(--paper)] py-10 sm:py-12">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 sm:grid-cols-3 sm:px-8">
          {[
            {
              k: "01",
              h: "Post as yourself, or anonymously",
              p: "Toggle anonymous mode on any story. Your identity stays yours.",
            },
            {
              k: "02",
              h: "Women-only, gently moderated",
              p: "A small team and AI assistance keep this space kind and safe.",
            },
            {
              k: "03",
              h: "Private support circles",
              p: "Invite-only groups for the conversations not meant for everyone.",
            },
          ].map((it) => (
            <div key={it.k}>
              <p className="font-serif text-sm italic text-[var(--rose-deep)]">{it.k}</p>
              <p className="mt-2 font-serif text-xl leading-snug text-foreground">{it.h}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="eyebrow">Conversations by season</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Eleven gentle rooms,
            <span className="italic text-[var(--rose-deep)]"> one circle of women.</span>
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {CATEGORIES.map((c, i) => (
              <div key={c.name} className="border-t border-border pt-4">
                <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--rose-deep)]">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 font-serif text-2xl text-foreground">{c.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEED PEEK */}
      <section className="border-t border-border bg-[var(--paper)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">From the community today</p>
              <h2 className="mt-3 max-w-2xl font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
                Real stories, <span className="italic text-[var(--rose-deep)]">heard fully.</span>
              </h2>
            </div>
            <Link
              to="/feed"
              className="hidden text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground sm:block"
            >
              See the feed →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {FEED_PEEK.map((p) => (
              <article
                key={p.title}
                className="flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="tag-chip">{p.tag}</span>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {p.category}
                  </span>
                </div>
                <h3 className="mt-4 font-serif text-xl leading-snug text-foreground">
                  {p.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {p.excerpt}
                </p>
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
                  <span>— {p.author}</span>
                  <span>
                    {p.hugs} hugs · {p.replies} replies
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CIRCLES */}
      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="eyebrow">Private support circles</p>
            <h2 className="mt-3 font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
              For the conversations that aren’t for the whole room.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Create invite-only circles for the seasons that need a smaller
              table — fertility, divorce, faith deconstruction, founding a
              company, finding therapy. Just you and the women you trust.
            </p>
            <Button asChild className="mt-8 h-12 rounded-full px-7">
              <Link to="/circles">Browse circles</Link>
            </Button>
          </div>
          <div className="grid gap-4">
            {[
              { name: "Soft launching motherhood", count: "12 sisters" },
              { name: "Leaving him, gently", count: "8 sisters" },
              { name: "First-time founders", count: "21 sisters" },
            ].map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-2xl border border-border bg-card p-5"
              >
                <div>
                  <p className="font-serif text-lg text-foreground">{c.name}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    Private · {c.count}
                  </p>
                </div>
                <span className="text-xs italic text-[var(--rose-deep)]">by invite</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="border-t border-border bg-[var(--paper)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-serif text-3xl font-light italic leading-snug text-foreground sm:text-4xl">
            “There is no greater agony than bearing an untold story inside you.”
          </p>
          <p className="mt-6 text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Maya Angelou
          </p>
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
            Your story belongs <span className="italic text-[var(--rose-deep)]">somewhere safe.</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
            Join thousands of women writing, asking and listening together.
            Anonymous by default. Free, always.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-14 rounded-full px-10 text-sm">
              <Link to="/auth" search={{ mode: "signup" }}>
                Join Her Haven
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 rounded-full border-border bg-transparent px-10 text-sm"
            >
              <Link to="/rules">Read the community rules</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
