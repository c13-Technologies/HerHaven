import { createFileRoute } from "@tanstack/react-router";
import { FileSearch, Search, Eye, EyeOff, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/content")({
  head: () => ({ meta: [{ title: "Content · Admin · Her Haven" }] }),
  component: AdminContentPage,
});

const PLANNED = [
  {
    icon: Search,
    title: "Search any post or reply",
    note: "Find content by title, body snippet, or author username — outside of the reports queue.",
  },
  {
    icon: Eye,
    title: "Browse live content",
    note: "Quick triage of what's currently visible to the community.",
  },
  {
    icon: EyeOff,
    title: "Browse hidden content",
    note: "Audit what mods have hidden, with the reason they gave.",
  },
  {
    icon: ShieldAlert,
    title: "Hide or reinstate",
    note: "Soft-hide with a required reason, or reinstate content that's been wrongly removed.",
  },
];

function AdminContentPage() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 sm:p-10">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--rose-soft)]/70 text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/20">
          <FileSearch className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow">Stage 2</p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">
            Content queue — coming soon
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            The migration already added the soft-delete columns on{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              posts
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              comments
            </code>{" "}
            plus the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              admin_hide_content
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              admin_reinstate_content
            </code>{" "}
            RPCs. This page will be the full UI for them.
          </p>
        </div>
      </div>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {PLANNED.map((p) => {
          const Icon = p.icon;
          return (
            <li
              key={p.title}
              className="rounded-xl border border-border bg-background/60 p-4"
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-4 w-4 text-[var(--rose-deep)]" />
                <div className="min-w-0">
                  <p className="font-serif text-base text-foreground">
                    {p.title}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.note}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
