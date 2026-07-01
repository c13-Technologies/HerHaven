import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface NotificationRow {
  id: string;
  user_id: string;
  read: boolean;
}

export function useNotificationCount(userId: string | undefined) {
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch initial unread count
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const fetchCount = async () => {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (!error && !cancelled) {
        setUnreadCount(count ?? 0);
      }
    };

    fetchCount();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Subscribe to realtime INSERT events
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload: RealtimePostgresChangesPayload<NotificationRow>) => {
          const row = payload.new as NotificationRow;
          if (row && !row.read) {
            setUnreadCount((c) => c + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const resetCount = useCallback(() => {
    setUnreadCount(0);
  }, []);

  return { unreadCount, resetCount };
}
