import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = { productId: string };

export function RatingBreakdown({ productId }: Props) {
  const [counts, setCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [total, setTotal] = useState(0);

  const load = async () => {
    const { data } = await supabase
      .from("product_ratings")
      .select("rating")
      .eq("product_id", productId);
    const list = (data ?? []) as { rating: number }[];
    const tally: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of list) {
      const n = Math.round(r.rating);
      if (n >= 1 && n <= 5) tally[n] = (tally[n] ?? 0) + 1;
    }
    setCounts(tally);
    setTotal(list.length);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`rating-breakdown-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_ratings", filter: `product_id=eq.${productId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  if (total === 0) return null;

  return (
    <div className="mt-4 space-y-1.5">
      {[5, 4, 3, 2, 1].map((n) => {
        const pct = total > 0 ? Math.round((counts[n] / total) * 100) : 0;
        return (
          <div key={n} className="flex items-center gap-2 text-xs">
            <span className="flex w-10 items-center gap-0.5 font-semibold">
              {n} <Star className="h-3 w-3 fill-amber-500 text-amber-500" strokeWidth={0} />
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-amber-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-10 text-right font-mono text-muted-foreground">
              {counts[n]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
