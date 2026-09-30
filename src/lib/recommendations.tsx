import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mapDbProduct, type Product } from "./products";
import { useAuth } from "./auth";
import { useRecentlyViewedSlugs } from "./recently-viewed";

type DbRow = Parameters<typeof mapDbProduct>[0];

export function useRecommendations(limit = 4) {
  const { user } = useAuth();
  const { slugs: recentSlugs } = useRecentlyViewedSlugs();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Gather signal sources
      const seenSlugs = new Set<string>(recentSlugs);
      const categoryScores = new Map<string, number>();

      // Categories from recently viewed
      if (recentSlugs.length > 0) {
        const { data: viewed } = await supabase
          .from("products")
          .select("slug, category")
          .in("slug", recentSlugs);
        for (const row of viewed ?? []) {
          categoryScores.set(row.category, (categoryScores.get(row.category) ?? 0) + 2);
        }
      }

      // Categories from wishlist + orders (signed-in only)
      if (user) {
        const [{ data: wish }, { data: orderItems }] = await Promise.all([
          supabase
            .from("wishlists")
            .select("product:products(slug, category)")
            .eq("user_id", user.id),
          supabase
            .from("order_items")
            .select("product_slug")
            .eq("user_id", user.id),
        ]);

        for (const w of wish ?? []) {
          const p = (w as { product: { slug: string; category: string } | null }).product;
          if (p) {
            seenSlugs.add(p.slug);
            categoryScores.set(p.category, (categoryScores.get(p.category) ?? 0) + 3);
          }
        }

        const ownedSlugs = (orderItems ?? []).map((o) => o.product_slug);
        for (const s of ownedSlugs) seenSlugs.add(s);
        if (ownedSlugs.length > 0) {
          const { data: ownedRows } = await supabase
            .from("products")
            .select("category")
            .in("slug", ownedSlugs);
          for (const row of ownedRows ?? []) {
            categoryScores.set(row.category, (categoryScores.get(row.category) ?? 0) + 4);
          }
        }
      }

      // 2. Pick top categories
      const topCats = Array.from(categoryScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c]) => c);

      let query = supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .order("rating", { ascending: false })
        .order("sales_count", { ascending: false })
        .limit(limit * 3);

      if (topCats.length > 0) query = query.in("category", topCats);

      const { data } = await query;
      if (cancelled) return;

      const filtered = (data ?? [])
        .map((p) => mapDbProduct(p as DbRow))
        .filter((p) => !seenSlugs.has(p.slug))
        .slice(0, limit);

      // Fallback: if we have nothing, fetch top products regardless
      if (filtered.length < 2) {
        const { data: fallback } = await supabase
          .from("products")
          .select("*")
          .eq("status", "published")
          .order("sales_count", { ascending: false })
          .limit(limit);
        if (cancelled) return;
        setProducts(
          (fallback ?? [])
            .map((p) => mapDbProduct(p as DbRow))
            .filter((p) => !seenSlugs.has(p.slug))
            .slice(0, limit),
        );
      } else {
        setProducts(filtered);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, recentSlugs.join(","), limit]);

  return { products, loading };
}
