import { createFileRoute, Link } from "@tanstack/react-router";
import { type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

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
    title: "He says I'm too sensitive. I don't know if I am anymore.",
    excerpt:
      "Three years in and every time I bring up something that hurt me, the conversation becomes about how I said it. I'm starting to lose my own voice…",
    author: "Anonymous",
    hugs: 248,
    replies: 86,
  },
  {
    tag: "Just venting",
    category: "Motherhood",
    title: "I love my baby and I miss who I was. Both can be true.",
    excerpt:
      "Nobody warned me how much I'd grieve the woman I was before her. I'd do it all again. But today I needed to say this out loud somewhere safe.",
    author: "Anonymous",
    hugs: 412,
    replies: 137,
  },
  {
    tag: "Need advice",
    category: "Career",
    title: "Asking for the raise I've earned — what would you say?",
    excerpt:
      "I've led the last two product launches and I'm still the lowest-paid person on my team. The meeting is on Monday. Tell me what to actually say.",
    author: "Maya",
    hugs: 91,
    replies: 54,
  },
];

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const [ref, visible] = useScrollReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function LandingPage() {
  const [heroRef, heroVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.3 });

  return (
    <div className="bg-background overflow-hidden">
      {/* HERO — with gradient wash and parallax */}
      <section className="relative px-5 pb-24 pt-16 sm:px-8 sm:pt-28 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-[var(--rose-soft)] blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-[var(--peach)] blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full bg-[var(--lavender)] blur-3xl" />
        </div>

        <div
          ref={heroRef}
          className={`relative mx-auto flex max-w-5xl flex-col items-center text-center transition-all duration-1000 ${
            heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm px-3 py-1 animate-in fade-in zoom-in duration-700">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--rose)] animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              A sacred space for stories
            </span>
          </div>

          <h1 className="mt-8 font-serif text-5xl font-light leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-8xl">
            Find your home in
            <br />
            <span className="italic text-[var(--rose-deep)] bg-gradient-to-r from-[var(--rose-deep)] to-[var(--peach)] bg-clip-text text-transparent">
              every season.
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-base font-light leading-relaxed text-muted-foreground sm:text-lg">
            A safe, supportive digital community where women share stories about
            relationships, career, motherhood, mental wellness, faith and the
            quiet work of becoming.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
            <Button asChild size="lg" className="h-14 rounded-full px-10 text-sm shadow-md hover:shadow-lg transition-shadow">
              <Link to="/auth" search={{ mode: "signup" }}>
                Join Her Haven
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 rounded-full border-border bg-transparent px-10 text-sm hover:bg-muted/50 transition"
            >
              <Link to="/feed">Explore the community</Link>
            </Button>
          </div>

          {/* Categories preview */}
          <div className="mt-20 w-full border-t border-border/70 pt-12">
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 text-left sm:grid-cols-4">
              {CATEGORIES.slice(0, 4).map((c, i) => (
                <RevealSection key={c.name} delay={i * 100}>
                  <p className="font-serif text-2xl text-foreground">{c.name}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {c.note}
                  </p>
                </RevealSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SAFETY STRIP */}
      <section className="border-y border-border bg-[var(--paper)] py-10 sm:py-14">
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
          ].map((it, i) => (
            <RevealSection key={it.k} delay={i * 150}>
              <p className="font-serif text-sm italic text-[var(--rose-deep)]">{it.k}</p>
              <p className="mt-2 font-serif text-xl leading-snug text-foreground">{it.h}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{it.p}</p>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <RevealSection>
            <p className="eyebrow">Conversations by season</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
              Eleven gentle rooms,
              <span className="italic text-[var(--rose-deep)]"> one circle of women.</span>
            </h2>
          </RevealSection>
          <div className="mt-12 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
            {CATEGORIES.map((c, i) => (
              <RevealSection key={c.name} delay={i * 80}>
                <div className="border-t border-border pt-4 transition-colors hover:border-muted-foreground/30">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--rose-deep)]">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-2 font-serif text-2xl text-foreground">{c.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{c.note}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* FEED PEEK */}
      <section className="border-t border-border bg-[var(--paper)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between gap-6">
            <RevealSection>
              <p className="eyebrow">From the community today</p>
              <h2 className="mt-3 max-w-2xl font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
                Real stories, <span className="italic text-[var(--rose-deep)]">heard fully.</span>
              </h2>
            </RevealSection>
            <Link
              to="/feed"
              className="hidden text-xs uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground transition sm:block"
            >
              See the feed →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {FEED_PEEK.map((p, i) => (
              <RevealSection key={p.title} delay={i * 150}>
                <article className="flex flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-muted-foreground/20">
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
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* CIRCLES */}
      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
          <RevealSection>
            <p className="eyebrow">Private support circles</p>
            <h2 className="mt-3 font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
              For the conversations that aren't for the whole room.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              Create invite-only circles for the seasons that need a smaller
              table — fertility, divorce, faith deconstruction, founding a
              company, finding therapy. Just you and the women you trust.
            </p>
            <Button asChild className="mt-8 h-12 rounded-full px-7">
              <Link to="/circles">Browse circles</Link>
            </Button>
          </RevealSection>
          <div className="grid gap-4">
            {[
              { name: "Soft launching motherhood", count: "12 sisters" },
              { name: "Leaving him, gently", count: "8 sisters" },
              { name: "First-time founders", count: "21 sisters" },
            ].map((c, i) => (
              <RevealSection key={c.name} delay={i * 150}>
                <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
                  <div>
                    <p className="font-serif text-lg text-foreground">{c.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                      Private · {c.count}
                    </p>
                  </div>
                  <span className="text-xs italic text-[var(--rose-deep)]">by invite</span>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* QUOTE */}
      <section className="relative border-t border-border bg-[var(--paper)] px-5 py-24 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--rose-soft)] blur-3xl" />
        </div>
        <RevealSection>
          <div className="relative mx-auto max-w-3xl text-center">
            <p className="font-serif text-3xl font-light italic leading-snug text-foreground sm:text-4xl">
              "There is no greater agony than bearing an untold story inside you."
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              Maya Angelou
            </p>
          </div>
        </RevealSection>
      </section>

      {/* FOOTER CTA */}
      <section className="px-5 py-24 sm:px-8">
        <RevealSection>
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <h2 className="font-serif text-4xl font-light leading-tight tracking-tight text-foreground sm:text-5xl">
              Your story belongs <span className="italic text-[var(--rose-deep)]">somewhere safe.</span>
            </h2>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
              Join thousands of women writing, asking and listening together.
              Anonymous by default. Free, always.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-14 rounded-full px-10 text-sm shadow-md hover:shadow-lg transition-shadow">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Join Her Haven
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-14 rounded-full border-border bg-transparent px-10 text-sm hover:bg-muted/50 transition"
              >
                <Link to="/rules">Read the community rules</Link>
              </Button>
            </div>
          </div>
        </RevealSection>
      </section>
    </div>
  );
}
