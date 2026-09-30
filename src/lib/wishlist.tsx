import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";
import { toast } from "sonner";

export function useWishlist(productId: string | undefined) {
  const { user } = useAuth();
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !productId) {
      setInWishlist(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();
      if (!cancelled) setInWishlist(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, productId]);

  const toggle = useCallback(async () => {
    if (!user) {
      toast.error("Sign in to save favorites");
      return;
    }
    if (!productId) return;
    setLoading(true);
    try {
      if (inWishlist) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
        setInWishlist(true);
        toast.success("Added to wishlist");
      }
    } catch (e) {
      toast.error((e as Error).message || "Could not update wishlist");
    } finally {
      setLoading(false);
    }
  }, [user, productId, inWishlist]);

  return { inWishlist, toggle, loading, canSave: !!user };
}
