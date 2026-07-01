import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · Her Haven" },
      { name: "description", content: "Why we built Her Haven — a warm, supportive community for women." },
      { property: "og:title", content: "About Her Haven" },
      { property: "og:description", content: "Why we built Her Haven — a warm, supportive community for women." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">Our story</p>
      <h1 className="mt-3 font-serif text-5xl font-light leading-tight tracking-tight text-foreground sm:text-6xl">
        Built for the in-between <span className="italic text-[var(--rose-deep)]">seasons.</span>
      </h1>

      <div className="mt-10 space-y-6 font-serif text-lg leading-relaxed text-foreground">
        <p>
          Her Haven began with a simple, stubborn idea: that women deserve a
          corner of the internet that feels like a long, soft Sunday phone call
          with a friend who knows what you mean before you finish the sentence.
        </p>
        <p>
          We are students and mothers, founders and stay-at-home daughters,
          newlyweds and women starting over. We come from everywhere. We hold
          the same handful of quiet questions.
        </p>
        <p className="italic text-[var(--rose-deep)]">
          Am I doing this right? Is anyone else? Can I say this out loud?
        </p>
        <p>
          You can say it out loud here. As yourself or anonymously. With your
          whole name or just your first one. In the open feed, or in a tiny
          circle of three.
        </p>
      </div>

      <h2 className="mt-16 font-serif text-3xl text-foreground">What we believe</h2>
      <ul className="mt-6 space-y-4 text-base leading-relaxed text-muted-foreground">
        <li>— Anonymity is a feature, not a flaw.</li>
        <li>— Kindness is not the same as agreement.</li>
        <li>— Moderation is care, not control.</li>
        <li>— Every woman deserves a place to be heard.</li>
      </ul>

      <div className="mt-16 flex flex-wrap gap-3">
        <Button asChild className="rounded-full">
          <Link to="/auth" search={{ mode: "signup" }}>Join Her Haven</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/rules">Read the community rules</Link>
        </Button>
      </div>
    </div>
  );
}
