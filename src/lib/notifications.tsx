import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type Notification = {
  id: string;
  type: string;
  payload: {
    product_slug?: string;
    product_title?: string;
    product_image?: string | null;
    old_price?: number;
    new_price?: number;
    [k: string]: unknown;
  };
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notification_queue")
      .select("id, type, payload, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data as Notification[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("notification_queue")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("read_at", null);
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const unreadCount = items.filter((n) => !n.read_at).length;

  return { items, unreadCount, loading, refresh, markAllRead };
}
