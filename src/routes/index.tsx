import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { useProducts, categories } from "@/lib/products";
import { ProductCard, ProductRow } from "@/components/product-card";
import { ProductCardSkeleton, ProductRowSkeleton } from "@/components/product-card-skeleton";
import { AppHeader } from "@/components/app-header";
import { SearchOverlay } from "@/components/search-overlay";
import { RecentlyViewed } from "@/components/recently-viewed";
import { Recommendations } from "@/components/recommendations";
import { BundleDeals } from "@/components/bundle-deals";
import { NotificationsBanner } from "@/components/notifications-banner";
import { HeroSlider } from "@/components/hero-slider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StudyMart — Digital products for curious minds" },
      { name: "description", content: "Notes, PDFs, prompts and courses. Instant download." },
      { property: "og:title", content: "StudyMart — Digital products" },
      { property: "og:description", content: "Notes, PDFs, prompts and courses. Instant download." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { products, loading } = useProducts();
  const [searchOpen, setSearchOpen] = useState(false);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const featuredOrAll = featured.length ? featured : products.slice(0, 4);
  const trending = [...products].sort((a, b) => b.sales - a.sales).slice(0, 4);

  return (
    <div>
      <AppHeader greeting />

      <div className="px-5 pt-5">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex h-13 w-full items-center gap-3 rounded-2xl border border-white/40 bg-background/60 px-4 text-left text-sm text-muted-foreground shadow-soft backdrop-blur-xl transition-colors active:bg-secondary"
          style={{ height: "52px" }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary">
            <Search className="h-[18px] w-[18px] text-foreground" />
          </span>
          <span>Search notes, PDFs, courses…</span>
        </button>
      </div>

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <NotificationsBanner />

      <HeroSlider />

      <Recommendations />

      <BundleDeals />

      <section className="pt-6">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold">Categories</h2>
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
          {categories.slice(1).map((c) => (
            <Link
              key={c}
              to="/shop"
              search={{ cat: c }}
              className="flex-shrink-0 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-foreground transition-colors active:bg-accent"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      <section className="pt-6">
        <div className="flex items-center justify-between px-5">
          <h2 className="text-lg font-bold">Featured</h2>
          <Link to="/shop" className="text-xs font-semibold text-brand">
            See all
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 px-5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : featuredOrAll.map((p) => <ProductCard key={p.slug} product={p} />)}
        </div>
      </section>

      <section className="px-5 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Trending now</h2>
          <Link to="/shop" className="text-xs font-semibold text-brand">
            See all
          </Link>
        </div>
        <div className="mt-3 space-y-2.5">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductRowSkeleton key={i} />)
            : trending.map((p) => <ProductRow key={p.slug} product={p} />)}
        </div>
      </section>

      <RecentlyViewed />

      <div className="h-6" />
    </div>
  );
}
