import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import notes from "@/assets/p-notes.jpg";
import pdf from "@/assets/p-pdf.jpg";
import prompts from "@/assets/p-prompts.jpg";
import course from "@/assets/p-course.jpg";
import bundle from "@/assets/p-bundle.jpg";
import planner from "@/assets/p-planner.jpg";

export type Category = string;
export type DeliveryType = "download" | "stream";

export type Product = {
  id?: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  format: string;
  delivery: DeliveryType;
  rating: number;
  sales: number;
  pages?: number;
  status?: string;
  featured?: boolean;
  preview_url?: string | null;
  preview_type?: "pdf" | "image" | "video" | null;
};

// Map seeded image paths to bundled asset URLs
const IMAGE_MAP: Record<string, string> = {
  "/assets/p-notes.jpg": notes,
  "/assets/p-pdf.jpg": pdf,
  "/assets/p-prompts.jpg": prompts,
  "/assets/p-course.jpg": course,
  "/assets/p-bundle.jpg": bundle,
  "/assets/p-planner.jpg": planner,
};

export function resolveImage(url: string | null | undefined): string {
  if (!url) return notes;
  return IMAGE_MAP[url] ?? url;
}

type DbProduct = {
  id: string;
  slug: string;
  title: string;
  tagline: string | null;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  format: string | null;
  delivery_type: string;
  rating: number | null;
  sales_count: number;
  status: string;
  featured: boolean;
  preview_url?: string | null;
  preview_type?: string | null;
};

export function mapDbProduct(p: DbProduct): Product {
  const pt = p.preview_type;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    tagline: p.tagline ?? "",
    description: p.description ?? "",
    price: Number(p.price),
    category: p.category,
    image: resolveImage(p.image_url),
    format: p.format ?? "",
    delivery: (p.delivery_type === "stream" ? "stream" : "download"),
    rating: Number(p.rating ?? 0),
    sales: p.sales_count,
    status: p.status,
    featured: p.featured,
    preview_url: p.preview_url ?? null,
    preview_type: pt === "pdf" || pt === "image" || pt === "video" ? pt : null,
  };
}

export const categories: ("All" | Category)[] = [
  "All",
  "Notes",
  "PDFs",
  "Prompts",
  "Courses",
  "Bundles",
];

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setProducts((data ?? []).map((p) => mapDbProduct(p as DbProduct)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { products, loading };
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
  return data ? mapDbProduct(data as DbProduct) : null;
}

export async function fetchProductsBySlugs(slugs: string[]): Promise<Product[]> {
  if (!slugs.length) return [];
  const { data } = await supabase.from("products").select("*").in("slug", slugs);
  return (data ?? []).map((p) => mapDbProduct(p as DbProduct));
}
