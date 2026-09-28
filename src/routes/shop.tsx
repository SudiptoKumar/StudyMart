import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, ArrowLeft, ArrowUpDown, SearchX } from "lucide-react";
import { categories, useProducts, type Category } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { ProductCardSkeleton } from "@/components/product-card-skeleton";

type SearchParams = { cat?: "All" | Category; q?: string };

type SortKey = "newest" | "price-asc" | "price-desc" | "top-rated" | "best-selling";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "top-rated", label: "Top rated" },
  { key: "best-selling", label: "Best selling" },
];

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): SearchParams => ({
    cat: (s.cat as SearchParams["cat"]) ?? "All",
    q: (s.q as string) ?? "",
  }),
  head: () => ({
    meta: [
      { title: "Browse | StudyMart" },
      { name: "description", content: "Browse the full catalogue of digital products." },
      { property: "og:title", content: "Browse | StudyMart" },
      { property: "og:description", content: "Browse the full catalogue." },
    ],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { cat = "All", q: initialQ = "" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(initialQ);
  const [active, setActive] = useState<"All" | Category>(cat);
  const [sort, setSort] = useState<SortKey>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const { products, loading } = useProducts();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = products
      .filter((p) => active === "All" || p.category === active)
      .filter(
        (p) =>
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );

    const sorted = [...filtered];
    switch (sort) {
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "top-rated":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "best-selling":
        sorted.sort((a, b) => b.sales - a.sales);
        break;
      case "newest":
      default:
        // products already returned newest first from loader
        break;
    }
    return sorted;
  }, [active, query, products, sort]);

  const activeSort = SORT_OPTIONS.find((s) => s.key === sort)!;

  return (
    <div>
      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-5 pb-3 pt-4">
          <Link
            to="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary"
            aria-label="Back"
          >
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
          <h1 className="text-xl font-bold">Browse</h1>
        </div>

        <div className="px-5 pb-3">
          <div className="flex h-12 items-center gap-3 rounded-2xl bg-secondary px-4">
            <Search className="h-[18px] w-[18px] text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar">
          {categories.map((c) => {
            const isActive = active === c;
            return (
              <button
                key={c}
                onClick={() => {
                  setActive(c);
                  navigate({ search: { cat: c } });
                }}
                className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </header>

      <div className="px-5 pt-2">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{loading ? "Loading…" : `${list.length} results`}</p>
          <div className="relative">
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {activeSort.label}
            </button>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
                <div className="absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                  {SORT_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      onClick={() => {
                        setSort(o.key);
                        setSortOpen(false);
                      }}
                      className={`block w-full px-4 py-2.5 text-left text-xs font-semibold transition-colors hover:bg-secondary ${
                        sort === o.key ? "bg-accent text-accent-foreground" : "text-foreground"
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <SearchX className="h-7 w-7 animate-pulse" />
            </div>
            <p className="text-sm text-muted-foreground">No products match your search.</p>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {list.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
