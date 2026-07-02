import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Crown, Search, Shield, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type AppRole = "admin" | "moderator" | "user";

type ProfileWithRoles = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  default_anonymous: boolean;
  user_roles: { role: AppRole }[];
};

const ROLE_META: Record<
  AppRole,
  { label: string; icon: typeof Shield; description: string; chipClass: string }
> = {
  user: {
    label: "Member",
    icon: Shield,
    description: "Default access — read and post.",
    chipClass: "bg-muted text-muted-foreground",
  },
  moderator: {
    label: "Moderator",
    icon: ShieldCheck,
    description: "Can hide content, manage reports.",
    chipClass: "bg-[var(--peach)]/40 text-[var(--ink)]",
  },
  admin: {
    label: "Admin",
    icon: Crown,
    description: "Everything moderators have, plus roles and categories.",
    chipClass: "bg-[var(--rose)] text-white",
  },
};

export const Route = createFileRoute("/_authenticated/admin/members")({
  head: () => ({ meta: [{ title: "Members · Admin · Her Haven" }] }),
  component: AdminMembersPage,
});

function AdminMembersPage() {
  const { isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [pending, setPending] = useState<
    | { target: ProfileWithRoles; newRole: AppRole }
    | null
  >(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: profiles } = useQuery({
    queryKey: ["admin-members", debounced],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, default_anonymous, user_roles(role)")
        .order("display_name", { ascending: true, nullsFirst: false })
        .limit(50);
      if (debounced.length >= 2) {
        // Escape PostgREST ilike wildcards AND any literal `%` / `_` /
        // `\` so a search for "50%" matches only literal "50%".
        const safe = debounced.replace(/[%_\\]/g, (m) => "\\" + m);
        q = q.or(`username.ilike.*${safe}*,display_name.ilike.*${safe}*`);
      }
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ProfileWithRoles[];
    },
  });

  const { data: totals } = useQuery({
    queryKey: ["admin-members-totals"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const submitRoleChange = async () => {
    if (!pending) return;
    const { target, newRole } = pending;
    try {
      const { error } = await supabase.rpc("admin_set_user_role", {
        p_target_user_id: target.id,
        p_role: newRole,
      });
      if (error) throw error;
      toast.success(
        `${target.display_name ?? target.username ?? "Member"} set as ${newRole}.`,
      );
      // Refresh the list AND anything else that depends on roles or counts.
      qc.invalidateQueries({ queryKey: ["admin-members"] });
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-overview-members"] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Role change failed";
      toast.error(msg);
    } finally {
      setPending(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl text-foreground">Members</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {totals === undefined ? "—" : totals} total · search by username or
            display name
          </p>
        </div>
      </div>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-11 pl-9"
          aria-label="Search members"
        />
      </div>

      {!isAdmin && (
        <p className="mt-4 rounded-2xl border border-dashed border-border bg-card/60 p-4 text-xs text-muted-foreground">
          You are signed in as a moderator. Only admins can change roles — you
          can browse, but the role-change menu is hidden.
        </p>
      )}

      <ul className="mt-6 space-y-2">
        {(profiles ?? []).map((p) => {
          const currentRoles = p.user_roles?.map((r) => r.role) ?? [];
          const initials = (p.display_name ?? p.username ?? "?")
            .slice(0, 1)
            .toUpperCase();
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--rose-soft)]/70 font-serif text-base text-[var(--rose-deep)] ring-1 ring-[var(--rose)]/20">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-base text-foreground">
                  {p.display_name ?? p.username ?? "Anonymous sister"}
                </p>
                {p.username && p.display_name && (
                  <p className="truncate text-xs text-muted-foreground">
                    @{p.username}
                  </p>
                )}
              </div>
              <div
                className="flex flex-wrap items-center gap-1.5"
                aria-label="Assigned roles"
              >
                {currentRoles.map((r) => (
                  <span
                    key={r}
                    role="status"
                    aria-label={`Role: ${ROLE_META[r].label}`}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${ROLE_META[r].chipClass}`}
                  >
                    {ROLE_META[r].label}
                  </span>
                ))}
              </div>
              {isAdmin && (
                <ChangeRoleMenu
                  currentRoles={currentRoles}
                  onPick={(newRole) => setPending({ target: p, newRole })}
                />
              )}
            </li>
          );
        })}
        {profiles && profiles.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No matching members.
          </li>
        )}
      </ul>

      <AlertDialog
        open={!!pending}
        onOpenChange={(o) => !o && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role</AlertDialogTitle>
            <AlertDialogDescription>
              {pending && (
                <>
                  Set{" "}
                  <span className="text-foreground">
                    {pending.target.display_name ??
                      pending.target.username ??
                      "this member"}
                  </span>{" "}
                  as{" "}
                  <span className="text-foreground">
                    {ROLE_META[pending.newRole].label}
                  </span>
                  ? Action recorded in the admin audit log.
                  {user && pending.target.id === user.id && (
                    <span className="mt-3 block rounded-lg border border-[var(--rose)]/40 bg-[var(--rose-soft)]/30 p-3 text-foreground">
                      <strong>Heads up — this is you.</strong> You'll lose
                      admin privileges after this change. Make sure at least
                      one other admin remains before you continue.
                    </span>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submitRoleChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ChangeRoleMenu({
  currentRoles,
  onPick,
}: {
  currentRoles: AppRole[];
  onPick: (role: AppRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const options = useMemo(
    () =>
      (["admin", "moderator", "user"] as AppRole[]).map((value) => ({
        value,
        ...ROLE_META[value],
      })),
    [],
  );

  return (
    <div ref={wrapRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        className="gap-1.5 rounded-full"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Change role
        <ChevronDown className="h-3.5 w-3.5" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-lg"
        >
          {options.map((o) => {
            const Icon = o.icon;
            const has = currentRoles.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="menuitem"
                disabled={has}
                onClick={() => {
                  setOpen(false);
                  onPick(o.value);
                }}
                className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Icon className="mt-0.5 h-4 w-4 text-[var(--rose-deep)]" />
                <span className="min-w-0">
                  <span className="flex items-center gap-2 font-medium text-foreground">
                    {has && (
                      <span aria-hidden className="text-[var(--rose-deep)]">✓</span>
                    )}
                    Set as {o.label.toLowerCase()}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {o.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
