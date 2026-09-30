import { useCallback, useEffect, useState } from "react";
import { fetchProductsBySlugs, type Product } from "./products";

const KEY = "sm_recently_viewed";
const MAX = 10;

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function write(slugs: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(slugs.slice(0, MAX)));
}

export function trackRecentlyViewed(slug: string) {
  if (!slug) return;
  const cur = read().filter((s) => s !== slug);
  cur.unshift(slug);
  write(cur);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("sm-recently-viewed-change"));
  }
}

export function useRecentlyViewedSlugs() {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    setSlugs(read());
    const handler = () => setSlugs(read());
    window.addEventListener("sm-recently-viewed-change", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("sm-recently-viewed-change", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const clear = useCallback(() => {
    write([]);
    setSlugs([]);
    window.dispatchEvent(new CustomEvent("sm-recently-viewed-change"));
  }, []);
  return { slugs, clear };
}

export function useRecentlyViewed(excludeSlug?: string) {
  const { slugs, clear } = useRecentlyViewedSlugs();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const filtered = slugs.filter((s) => s !== excludeSlug);
    if (filtered.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const fetched = await fetchProductsBySlugs(filtered);
      if (cancelled) return;
      // Preserve order
      const map = new Map(fetched.map((p) => [p.slug, p]));
      setProducts(filtered.map((s) => map.get(s)).filter(Boolean) as Product[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slugs, excludeSlug]);

  return { products, loading, clear };
}
