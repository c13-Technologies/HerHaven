import { createFileRoute } from "@tanstack/react-router";
import { Users, Search, Shield, Crown, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/members")({
  head: () => ({ meta: [{ title: "Members · Admin · Her Haven" }] }),
  component: AdminMembersPage,
});

const PLANNED = [
  {
    icon: Search,
    title: "Search by username or display name",
    note: "Find a sister fast and jump to her profile.",
  },
  {
    icon: Shield,
    title: "Promote / demote roles",
    note: "Calls the admin_set_user_role RPC — server-verified, audit-logged.",
  },
  {
    icon: Crown,
    title: "See the role family",
    note: "Plain user, moderator, admin — add a row, remove it, watch the feed update.",
  },
  {
    icon: ShieldCheck,
    title: "Suspend abusive accounts (future)",
    note: "Write from admin RPCs only — no client-side role mutation.",
  },
];

function AdminMembersPage() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-6 sm:p-10">
      <div className="flex items-start gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[var(--rose-soft)]/70 text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/20">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <p className="eyebrow">Stage 3</p>
          <h2 className="mt-2 font-serif text-2xl text-foreground">
            Members — coming soon
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Profile search and role changes will route through the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              admin_set_user_role
            </code>{" "}
            RPC, which writes a row to{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              admin_audit_logs
            </code>{" "}
            in the same DB transaction.
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
                  <p className="font-serif text-base text-foreground">{p.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{p.note}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
