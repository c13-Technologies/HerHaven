import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Her Haven" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifs } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Quiet bell</p>
          <h1 className="mt-2 truncate font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Notifications
          </h1>
        </div>
        <Button onClick={markAllRead} variant="outline" className="shrink-0 rounded-full">
          Mark all read
        </Button>
      </div>

      <div className="mt-10 space-y-3">
        {(notifs ?? []).map((n) => (
          <Link
            key={n.id}
            to={(n.link as "/feed") ?? "/feed"}
            className={
              "block rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm " +
              (n.read ? "border-border bg-card" : "border-[var(--rose)] bg-[var(--rose-soft)]/40")
            }
          >
            <p className="font-serif text-base text-foreground">{n.title}</p>
            {n.body && <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>}
            <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </p>
          </Link>
        ))}
        {notifs && notifs.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No notifications yet. Quiet days are good days.
          </p>
        )}
      </div>
    </div>
  );
}
