import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchProductsBySlugs, resolveImage, type Product } from "./products";

export type Bundle = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image: string;
  image_url: string | null;
  price: number;
  original_price: number | null;
  status: string;
  featured: boolean;
};

export type BundleWithItems = Bundle & {
  items: Product[];
  itemsTotal: number;
  savings: number;
};

type DbBundle = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  price: number;
  original_price: number | null;
  status: string;
  featured: boolean;
};

function map(b: DbBundle): Bundle {
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    description: b.description,
    image: resolveImage(b.image_url),
    image_url: b.image_url,
    price: Number(b.price),
    original_price: b.original_price !== null ? Number(b.original_price) : null,
    status: b.status,
    featured: b.featured,
  };
}

export const BUNDLE_PREFIX = "bundle:";

export function isBundleSlug(slug: string) {
  return slug.startsWith(BUNDLE_PREFIX);
}

export function bundleSlugFromKey(key: string) {
  return key.slice(BUNDLE_PREFIX.length);
}

export function useBundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("bundles")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setBundles((data ?? []).map((b) => map(b as DbBundle)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { bundles, loading };
}

export async function fetchBundleBySlug(slug: string): Promise<BundleWithItems | null> {
  const { data: b } = await supabase.from("bundles").select("*").eq("slug", slug).maybeSingle();
  if (!b) return null;
  const bundle = map(b as DbBundle);
  const { data: rows } = await supabase
    .from("bundle_items")
    .select("product_slug, position")
    .eq("bundle_id", bundle.id)
    .order("position", { ascending: true });
  const slugs = (rows ?? []).map((r) => r.product_slug);
  const products = await fetchProductsBySlugs(slugs);
  const ordered = slugs
    .map((s) => products.find((p) => p.slug === s))
    .filter(Boolean) as Product[];
  const itemsTotal = ordered.reduce((s, p) => s + p.price, 0);
  return {
    ...bundle,
    items: ordered,
    itemsTotal,
    savings: Math.max(0, itemsTotal - bundle.price),
  };
}
