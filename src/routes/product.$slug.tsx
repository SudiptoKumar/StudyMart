import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Star, Download, PlayCircle, Check, Heart, Zap, ArrowRight, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchProductBySlug, type Product } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { useWishlist } from "@/lib/wishlist";
import { ProductCard } from "@/components/product-card";
import { trackRecentlyViewed } from "@/lib/recently-viewed";
import { RecentlyViewed } from "@/components/recently-viewed";
import { supabase } from "@/integrations/supabase/client";
import { mapDbProduct } from "@/lib/products";
import { ProductRating } from "@/components/product-rating";
import { ProductComments } from "@/components/product-comments";

import { PreviewButton } from "@/components/preview-sheet";
import { PriceAlertButton } from "@/components/price-alert-button";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await fetchProductBySlug(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.title} | StudyMart` },
          { name: "description", content: loaderData.product.tagline },
          { property: "og:title", content: `${loaderData.product.title} | StudyMart` },
          { property: "og:description", content: loaderData.product.tagline },
          { property: "og:image", content: loaderData.product.image },
        ]
      : [],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <div className="px-6 py-32 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <Link to="/shop" className="mt-6 inline-block text-sm font-semibold text-brand">
        Back to browse →
      </Link>
    </div>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { add, replace } = useCart();
  const navigate = useNavigate();
  const [added, setAdded] = useState(false);
  const [recs, setRecs] = useState<Product[]>([]);
  const [salesCount, setSalesCount] = useState<number>(product.sales);
  const [liveRating, setLiveRating] = useState<number>(product.rating);
  const { inWishlist, toggle: toggleWishlist, loading: wishLoading } = useWishlist(product.id);

  useEffect(() => {
    trackRecentlyViewed(product.slug);
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .eq("category", product.category)
        .neq("slug", product.slug)
        .limit(2);
      setRecs((data ?? []).map((p) => mapDbProduct(p as Parameters<typeof mapDbProduct>[0])));
    })();
  }, [product.slug, product.category]);

  // Realtime: keep sales_count and rating fresh on this product row
  useEffect(() => {
    if (!product.id) return;
    const channel = supabase
      .channel(`product-${product.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "products", filter: `id=eq.${product.id}` },
        (payload) => {
          const next = payload.new as { sales_count?: number; rating?: number };
          if (typeof next.sales_count === "number") setSalesCount(next.sales_count);
          if (typeof next.rating === "number") setLiveRating(Number(next.rating));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [product.id]);

  return (
    <div>
      {/* Image hero with floating back button */}
      <div className="relative">
        <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
          <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
        </div>
        <Link
          to="/shop"
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-md shadow-soft"
          aria-label="Back"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
        <button
          onClick={toggleWishlist}
          disabled={wishLoading}
          aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur-md shadow-soft transition-transform active:scale-90 disabled:opacity-60"
        >
          <Heart
            key={inWishlist ? "on" : "off"}
            className={`h-[18px] w-[18px] transition-colors ${
              inWishlist ? "fill-destructive text-destructive animate-in zoom-in-50 duration-300" : "text-foreground"
            }`}
            strokeWidth={inWishlist ? 0 : 2}
          />
        </button>
      </div>

      {/* Sheet-style content */}
      <div className="-mt-6 rounded-t-3xl bg-background px-5 pb-32 pt-8">
        <div className="space-y-4">
          <div className="flex items-center gap-x-2.5 gap-y-1.5 flex-wrap">
            <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
              {product.category}
            </span>
            {liveRating > 0 && (
              <>
                <div className="flex items-center gap-1 text-xs">
                  <Star className="h-3.5 w-3.5 fill-current text-amber-500" strokeWidth={0} />
                  <span className="font-semibold text-foreground">{Number(liveRating).toFixed(1)}</span>
                </div>
                <span className="text-xs text-muted-foreground">·</span>
              </>
            )}
            {salesCount >= 10 && (
              <>
                <span className="text-xs text-muted-foreground">{salesCount.toLocaleString()} sold</span>
                <span className="text-xs text-muted-foreground">·</span>
              </>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {product.delivery === "stream" ? (
                <PlayCircle className="h-3.5 w-3.5" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {product.delivery === "stream" ? "Streaming" : "Instant"}
            </span>
            <div className="ml-auto pl-2">
              {product.id && <PriceAlertButton productId={product.id} currentPrice={product.price} size="sm" />}
            </div>
          </div>
          <div className="pt-1">
            <h1 className="text-2xl font-bold leading-tight">{product.title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{product.tagline}</p>
          </div>

          <PreviewButton previewUrl={product.preview_url} previewType={product.preview_type} />

          {/* Description */}
          <div className="rounded-2xl bg-card p-4 shadow-soft">
            <h2 className="text-sm font-bold">What you'll get</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
          </div>

          {/* Specs */}
          <div className="rounded-2xl bg-card p-4 shadow-soft divide-y divide-border">
            <div className="flex items-center justify-between py-2 first:pt-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Format</p>
              <p className="text-sm font-semibold">{product.format}</p>
            </div>
            <div className="flex items-center justify-between py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Delivery</p>
              <p className="text-sm font-semibold">Immediate</p>
            </div>
            <div className="flex items-center justify-between py-2 last:pb-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">License</p>
              <p className="text-sm font-semibold">Personal</p>
            </div>
          </div>

          {/* Ratings & Comments */}
          {product.id && (
            <>
              <ProductRating productId={product.id} productSlug={product.slug} />
              <ProductComments productId={product.id} />
            </>
          )}
          {recs.length > 0 && (
            <section>
              <h2 className="text-base font-bold">You might also like</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {recs.map((p) => (
                  <ProductCard key={p.slug} product={p} />
                ))}
              </div>
            </section>
          )}

          <div className="-mx-5">
            <RecentlyViewed excludeSlug={product.slug} />
          </div>
        </div>
      </div>

      {/* Sticky bottom action bar */}
      <div
        className="fixed bottom-3 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] -translate-x-1/2 rounded-2xl border border-white/30 bg-background/50 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] pt-3 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-background/40"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-12 shrink-0 items-center rounded-full bg-secondary px-4 text-sm font-bold text-foreground">
            {formatPrice(product.price)}
          </div>
          <button
            onClick={() => {
              add(product.slug);
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
            aria-label="Add to cart"
            className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-foreground transition-all active:scale-90 hover:bg-accent"
          >
            {added ? (
              <Check className="h-[18px] w-[18px] animate-in zoom-in-50 duration-300" />
            ) : (
              <ShoppingCart className="h-[18px] w-[18px] transition-transform group-hover:scale-110 group-active:scale-90" />
            )}
          </button>
          <button
            onClick={() => {
              replace([{ slug: product.slug, qty: 1 }]);
              navigate({ to: "/checkout" });
            }}
            className="group flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-all active:opacity-90 active:scale-[0.97] hover:shadow-md"
          >
            <Zap className="h-4 w-4 transition-transform group-hover:scale-110" />
            Buy now
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-active:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
