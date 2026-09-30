import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { fetchProductsBySlugs, type Product } from "./products";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth";

type CartItem = { slug: string; qty: number };

type CartCtx = {
  items: CartItem[];
  add: (slug: string) => void;
  replace: (items: CartItem[]) => void;
  remove: (slug: string) => void;
  setQty: (slug: string, qty: number) => void;
  clear: () => void;
  count: number;
  detailed: { product: Product; qty: number }[];
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);

const LS_KEY = "cart";

function normalizeItems(items: CartItem[]): CartItem[] {
  const qtyBySlug = new Map<string, number>();

  for (const item of items) {
    if (!item?.slug) continue;
    const safeQty = Math.max(1, Math.min(99, Math.trunc(Number(item.qty) || 1)));
    qtyBySlug.set(item.slug, safeQty);
  }

  return Array.from(qtyBySlug.entries()).map(([slug, qty]) => ({ slug, qty }));
}

function readLocal(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return normalizeItems(JSON.parse(raw) as CartItem[]);
  } catch {
    return [];
  }
}

function writeLocal(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(normalizeItems(items)));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const hydratedRef = useRef(false);
  const lastUserIdRef = useRef<string | null | undefined>(undefined);

  // Wait for auth to resolve before hydrating cart state.
  useEffect(() => {
    if (loading || hydratedRef.current) return;

    if (user?.id) {
      hydratedRef.current = true;
      return;
    }

    setItems(readLocal());
    hydratedRef.current = true;
  }, [loading, user?.id]);

  // Sync with DB on login/logout changes
  useEffect(() => {
    if (loading || !hydratedRef.current) return;

    const uid = user?.id ?? null;
    if (uid === lastUserIdRef.current) return;
    lastUserIdRef.current = uid;

    if (!uid) {
      const guestItems = readLocal();
      setItems(guestItems);
      writeLocal(guestItems);
      return;
    }

    void (async () => {
      const guestItems = readLocal();
      const { data: dbRows, error } = await supabase.from("cart_items").select("product_slug, quantity").eq("user_id", uid);

      if (error) {
        console.error("Could not load saved cart", error);
        setItems([]);
        writeLocal([]);
        return;
      }

      const dbItems = normalizeItems(
        (dbRows ?? []).map((row) => ({ slug: row.product_slug, qty: row.quantity })),
      );

      const guestOnlyItems = guestItems.filter((guestItem) => !dbItems.some((dbItem) => dbItem.slug === guestItem.slug));
      const mergedItems = normalizeItems([...dbItems, ...guestOnlyItems]);

      setItems(mergedItems);
      writeLocal([]);

      if (guestOnlyItems.length > 0) {
        await supabase.from("cart_items").upsert(
          guestOnlyItems.map((item) => ({ user_id: uid, product_slug: item.slug, quantity: item.qty })),
          { onConflict: "user_id,product_slug" },
        );
      }
    })();
  }, [loading, user?.id]);

  // Persist guest cart only
  useEffect(() => {
    if (!hydratedRef.current || user?.id) return;
    writeLocal(items);
  }, [items, user?.id]);

  // Fetch product details for cart items
  useEffect(() => {
    const slugs = items.map((i) => i.slug).filter((s) => !productMap[s]);
    if (!slugs.length) return;
    (async () => {
      const fetched = await fetchProductsBySlugs(slugs);
      setProductMap((prev) => {
        const next = { ...prev };
        for (const p of fetched) next[p.slug] = p;
        return next;
      });
    })();
  }, [items, productMap]);

  const dbUpsert = (slug: string, qty: number) => {
    const uid = user?.id;
    if (!uid) return;
    void supabase
      .from("cart_items")
      .upsert({ user_id: uid, product_slug: slug, quantity: Math.max(1, Math.min(99, qty)) }, { onConflict: "user_id,product_slug" });
  };
  const dbDelete = (slug: string) => {
    const uid = user?.id;
    if (!uid) return;
    void supabase.from("cart_items").delete().eq("user_id", uid).eq("product_slug", slug);
  };
  const dbClear = () => {
    const uid = user?.id;
    if (!uid) return;
    void supabase
      .from("cart_items")
      .delete()
      .eq("user_id", uid)
      .then(({ error }) => {
        if (error) console.error("Could not clear saved cart", error);
      });
  };

  const value = useMemo<CartCtx>(() => {
    const detailed = items
      .map((i) => {
        const product = productMap[i.slug];
        return product ? { product, qty: i.qty } : null;
      })
      .filter(Boolean) as { product: Product; qty: number }[];

    return {
      items,
      add: (slug) =>
        setItems((prev) => {
          const next = normalizeItems(
            prev.some((item) => item.slug === slug)
              ? prev.map((item) => (item.slug === slug ? { ...item, qty: item.qty + 1 } : item))
              : [...prev, { slug, qty: 1 }],
          );
          const qty = next.find((item) => item.slug === slug)?.qty ?? 1;
          dbUpsert(slug, qty);
          return next;
        }),
      replace: (nextItems) => {
        const normalized = normalizeItems(nextItems);
        setItems(normalized);

        const uid = user?.id;
        if (!uid) return;

        void (async () => {
          const { error: deleteError } = await supabase.from("cart_items").delete().eq("user_id", uid);
          if (deleteError) {
            console.error("Could not replace saved cart", deleteError);
            return;
          }

          if (normalized.length > 0) {
            const { error: upsertError } = await supabase.from("cart_items").upsert(
              normalized.map((item) => ({ user_id: uid, product_slug: item.slug, quantity: item.qty })),
              { onConflict: "user_id,product_slug" },
            );
            if (upsertError) console.error("Could not save replacement cart", upsertError);
          }
        })();
      },
      remove: (slug) =>
        setItems((prev) => {
          dbDelete(slug);
          return prev.filter((item) => item.slug !== slug);
        }),
      setQty: (slug, qty) =>
        setItems((prev) => {
          if (qty <= 0) {
            dbDelete(slug);
            return prev.filter((item) => item.slug !== slug);
          }
          const safeQty = Math.max(1, Math.min(99, qty));
          dbUpsert(slug, safeQty);
          return prev.map((item) => (item.slug === slug ? { ...item, qty: safeQty } : item));
        }),
      clear: () => {
        dbClear();
        setItems([]);
      },
      count: items.reduce((n, i) => n + i.qty, 0),
      detailed,
      subtotal: detailed.reduce((s, { product, qty }) => s + product.price * qty, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, productMap, user?.id]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

