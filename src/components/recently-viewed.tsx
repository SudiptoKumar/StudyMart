import { useRecentlyViewed } from "@/lib/recently-viewed";
import { ProductCard } from "./product-card";

export function RecentlyViewed({
  excludeSlug,
  title = "Recently viewed",
  limit = 6,
}: {
  excludeSlug?: string;
  title?: string;
  limit?: number;
}) {
  const { products, clear } = useRecentlyViewed(excludeSlug);
  if (products.length === 0) return null;
  const list = products.slice(0, limit);

  return (
    <section className="pt-6">
      <div className="flex items-center justify-between px-5">
        <h2 className="text-lg font-bold">{title}</h2>
        <button onClick={clear} className="text-xs font-semibold text-muted-foreground">
          Clear
        </button>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
        {list.map((p) => (
          <div key={p.slug} className="w-[150px] flex-shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}
