import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

export type PriceAlert = {
  id: string;
  product_id: string;
  target_price: number | null;
  created_at: string;
  notified_at: string | null;
};

export function usePriceAlert(productId: string | undefined) {
  const { user } = useAuth();
  const [alert, setAlert] = useState<PriceAlert | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !productId) {
      setAlert(null);
      return;
    }
    const { data } = await supabase
      .from("price_alerts")
      .select("id, product_id, target_price, created_at, notified_at")
      .eq("user_id", user.id)
      .eq("product_id", productId)
      .maybeSingle();
    setAlert((data as PriceAlert) ?? null);
  }, [user, productId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = async (targetPrice: number | null) => {
    if (!user || !productId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("price_alerts")
        .insert({ user_id: user.id, product_id: productId, target_price: targetPrice })
        .select()
        .single();
      if (error) throw error;
      setAlert(data as PriceAlert);
    } finally {
      setLoading(false);
    }
  };

  const remove = async () => {
    if (!user || !alert) return;
    setLoading(true);
    try {
      await supabase.from("price_alerts").delete().eq("id", alert.id);
      setAlert(null);
    } finally {
      setLoading(false);
    }
  };

  return { alert, loading, create, remove, refresh };
}

export function useAllAlerts() {
  const { user } = useAuth();
  const [items, setItems] = useState<
    (PriceAlert & { product_title: string; product_slug: string; product_price: number })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: alerts } = await supabase
      .from("price_alerts")
      .select("id, product_id, target_price, created_at, notified_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    const ids = (alerts ?? []).map((a) => a.product_id);
    if (!ids.length) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: products } = await supabase
      .from("products")
      .select("id, slug, title, price")
      .in("id", ids);
    const map = new Map((products ?? []).map((p) => [p.id, p]));
    setItems(
      (alerts ?? []).map((a) => {
        const p = map.get(a.product_id);
        return {
          ...(a as PriceAlert),
          product_title: p?.title ?? "—",
          product_slug: p?.slug ?? "",
          product_price: Number(p?.price ?? 0),
        };
      }),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const remove = async (id: string) => {
    await supabase.from("price_alerts").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return { items, loading, refresh, remove };
}
