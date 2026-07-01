import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Community rules · Her Haven" },
      { name: "description", content: "The values and rules that keep Her Haven safe." },
      { property: "og:title", content: "Community rules · Her Haven" },
      { property: "og:description", content: "How we keep this community kind and safe." },
    ],
  }),
  component: RulesPage,
});

const RULES = [
  { h: "Lead with kindness.", p: "Disagree gently. Critique ideas, never people. Tone is part of the message." },
  { h: "Protect anonymity.", p: "Don’t out anyone, even by hint. If a sister chose to be anonymous, that’s the whole story." },
  { h: "No hate, no harassment.", p: "Racism, transphobia, slurs, and personal attacks are removed immediately." },
  { h: "No solicitation or spam.", p: "This isn’t a marketplace. No selling, no DMing strangers with offers, no link farms." },
  { h: "Mind sensitive content.", p: "Tag stories about abuse, self-harm, miscarriage, or eating disorders with the sensitive flag." },
  { h: "Ask before advice.", p: "If a story is tagged Just venting, listen — don’t fix. If it’s tagged Need advice, share gently." },
  { h: "Report, don’t feud.", p: "If something crosses a line, use the report button. Our moderators read every one." },
];

function RulesPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">House rules</p>
      <h1 className="mt-3 font-serif text-5xl font-light leading-tight tracking-tight text-foreground sm:text-6xl">
        How we keep this <span className="italic text-[var(--rose-deep)]">soft.</span>
      </h1>
      <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
        Her Haven only works because we all agree to a few small things.
        Reading this once is part of being a member.
      </p>

      <ol className="mt-12 space-y-8">
        {RULES.map((r, i) => (
          <li key={r.h} className="grid grid-cols-[auto_minmax(0,1fr)] gap-5 border-t border-border pt-6">
            <p className="font-serif text-2xl italic text-[var(--rose-deep)]">{String(i + 1).padStart(2, "0")}</p>
            <div className="min-w-0">
              <p className="font-serif text-2xl text-foreground">{r.h}</p>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">{r.p}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
