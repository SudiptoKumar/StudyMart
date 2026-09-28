import { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Props = {
  productId: string;
  productSlug: string;
};

export function ProductRating({ productId, productSlug }: Props) {
  const { user } = useAuth();
  const [avg, setAvg] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [myRating, setMyRating] = useState<number | null>(null);
  const [hover, setHover] = useState<number>(0);
  const [canRate, setCanRate] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  const loadAggregate = async () => {
    const { data } = await supabase
      .from("product_ratings")
      .select("rating")
      .eq("product_id", productId);
    const list = (data ?? []) as { rating: number }[];
    setCount(list.length);
    setAvg(list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0);
  };

  useEffect(() => {
    loadAggregate();
    const channel = supabase
      .channel(`ratings-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_ratings", filter: `product_id=eq.${productId}` },
        () => loadAggregate(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (!user) {
      setMyRating(null);
      setCanRate(false);
      return;
    }
    (async () => {
      const [{ data: mine }, { data: purchased }] = await Promise.all([
        supabase
          .from("product_ratings")
          .select("rating")
          .eq("product_id", productId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("order_items")
          .select("id")
          .eq("user_id", user.id)
          .eq("product_slug", productSlug)
          .limit(1),
      ]);
      setMyRating(mine?.rating ?? null);
      setCanRate(((purchased ?? []) as unknown[]).length > 0);
    })();
  }, [user, productId, productSlug]);

  const submit = async (value: number) => {
    if (!user) return toast.error("Sign in to rate");
    if (!canRate) return toast.error("Only buyers can rate this product");
    setSaving(true);
    const { error } = await supabase
      .from("product_ratings")
      .upsert(
        { product_id: productId, user_id: user.id, rating: value },
        { onConflict: "product_id,user_id" },
      );
    setSaving(false);
    if (error) return toast.error(error.message);
    setMyRating(value);
    toast.success("Thanks for your rating!");
  };

  const display = hover || myRating || 0;

  return (
    <section className="mt-6 rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Ratings</h2>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-current text-amber-500" strokeWidth={0} />
          <span className="font-semibold text-foreground">{avg.toFixed(1)}</span>
          <span>({count})</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={!canRate || saving}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => submit(n)}
            className="p-0.5 disabled:cursor-not-allowed"
            aria-label={`Rate ${n} stars`}
          >
            <Star
              className={`h-7 w-7 transition ${
                n <= display ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"
              }`}
              strokeWidth={1.5}
            />
          </button>
        ))}
        {saving && <Loader2 className="ml-2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {!user
          ? "Sign in and purchase to rate this product."
          : !canRate
            ? "Only buyers can rate this product."
            : myRating
              ? `Your rating: ${myRating} ★ — tap to update.`
              : "Tap a star to leave your rating."}
      </p>
    </section>
  );
}
