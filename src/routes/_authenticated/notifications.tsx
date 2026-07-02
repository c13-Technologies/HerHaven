import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  AtSign,
  Heart,
  Users,
  Activity,
  Bell,
  ChevronDown,
  Trash2,
  CheckCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications · Her Haven" }] }),
  component: NotificationsPage,
});

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

type GroupDef = {
  key: string;
  label: string;
  icon: typeof Bell;
};

const GROUPS: GroupDef[] = [
  { key: "reply", label: "Replies", icon: MessageCircle },
  { key: "mention", label: "Mentions", icon: AtSign },
  { key: "reaction", label: "Reactions", icon: Heart },
  { key: "circle_invite", label: "Circle Invites", icon: Users },
  { key: "circle_activity", label: "Circle Activity", icon: Activity },
  { key: "system", label: "System", icon: Bell },
];

// ---------------------------------------------------------------------------
// Swipeable notification card (mobile)
// ---------------------------------------------------------------------------

function SwipeableCard({
  n,
  onRead,
  onDismiss,
}: {
  n: NotificationRow;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);
  const [isSwiping, setIsSwiping] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dismissing, setDismissing] = useState(false);
  const threshold = 80;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = e.touches[0].clientX;
    swiping.current = true;
    setIsSwiping(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping.current) return;
    currentX.current = e.touches[0].clientX;
    const dx = currentX.current - startX.current;
    if (dx > 0) {
      setOffset(0);
      return;
    }
    setOffset(Math.max(dx, -120));
  }, []);

  const onTouchEnd = useCallback(() => {
    swiping.current = false;
    setIsSwiping(false);
    const finalOffset = offset;
    if (finalOffset < -threshold) {
      setDismissing(true);
      setOffset(-200);
      setTimeout(() => onDismiss(n.id), 250);
    } else {
      setOffset(0);
    }
  }, [offset, threshold, n.id, onDismiss]);

  const markRead = useCallback(() => {
    if (!n.read) onRead(n.id);
  }, [n.read, n.id, onRead]);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Delete background */}
      <div className="absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-[var(--rose-deep)] text-white">
        <Trash2 className="h-5 w-5" />
      </div>

      <Link
        to={n.link ?? "/feed"}
        onClick={markRead}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isSwiping ? "none" : "transform 0.25s ease",
        }}
        className={
          "group relative z-10 block border p-5 transition-colors " +
          (dismissing
            ? "opacity-0 duration-200"
            : offset < -20
              ? "border-[var(--rose-deep)]/60 bg-[var(--rose-soft)]/30"
              : n.read
                ? "border-border bg-card hover:border-[var(--rose-soft)]/60"
                : "border-[var(--rose)] bg-[var(--rose-soft)]/40 hover:border-[var(--rose-deep)]/50")
        }
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-serif text-base text-foreground">{n.title}</p>
            {n.body && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {n.body}
              </p>
            )}
            <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDismiss(n.id);
              }}
              className="rounded-full p-1.5 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-[var(--rose-deep)] group-hover:opacity-100"
              aria-label="Dismiss"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            {!n.read && (
              <span className="h-2 w-2 rounded-full bg-[var(--rose)]" />
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Group section
// ---------------------------------------------------------------------------

function NotificationGroup({
  group,
  items,
  expanded,
  onToggle,
  onRead,
  onDismiss,
}: {
  group: GroupDef;
  items: NotificationRow[];
  expanded: boolean;
  onToggle: () => void;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const unread = items.filter((n) => !n.read).length;
  const Icon = group.icon;

  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-serif text-lg text-foreground">
            {group.label}
          </span>
          {unread > 0 && (
            <span className="rounded-full bg-[var(--rose)] px-2 py-0.5 text-[11px] font-semibold text-white">
              {unread}
            </span>
          )}
        </div>
        <ChevronDown
          className={
            "h-4 w-4 text-muted-foreground transition-transform " +
            (expanded ? "rotate-180" : "")
          }
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-3 pl-4">
          {items.map((n) => (
            <SwipeableCard
              key={n.id}
              n={n}
              onRead={onRead}
              onDismiss={onDismiss}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(GROUPS.map((g) => g.key)),
  );

  const { data: notifs } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return (data ?? []) as NotificationRow[];
    },
  });

  const grouped: Record<string, NotificationRow[]> = {};
  for (const g of GROUPS) grouped[g.key] = [];
  for (const n of notifs ?? []) {
    const key = GROUPS.some((g) => g.key === n.type) ? n.type : "system";
    if (grouped[key]) grouped[key].push(n);
    else grouped.system.push(n);
  }

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const markOneRead = async (id: string) => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const dismissOne = async (id: string) => {
    if (!user) return;
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const toggleGroup = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const totalUnread =
    notifs?.filter((n) => !n.read).length ?? 0;
  const totalCount = notifs?.length ?? 0;

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Quiet bell</p>
          <h1 className="mt-2 truncate font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Notifications
          </h1>
        </div>
        {totalUnread > 0 && (
          <Button
            onClick={markAllRead}
            variant="outline"
            className="shrink-0 gap-2 rounded-full"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Grouped list */}
      <div className="mt-10 space-y-1">
        {notifs && totalCount === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No notifications yet. Quiet days are good days.
          </p>
        )}

        {GROUPS.map((group) => {
          const items = grouped[group.key] ?? [];
          if (items.length === 0) return null;
          return (
            <NotificationGroup
              key={group.key}
              group={group}
              items={items}
              expanded={expanded.has(group.key)}
              onToggle={() => toggleGroup(group.key)}
              onRead={markOneRead}
              onDismiss={dismissOne}
            />
          );
        })}
      </div>
    </div>
  );
}
