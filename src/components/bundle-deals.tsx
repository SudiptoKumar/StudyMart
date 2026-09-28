import { useBundles } from "@/lib/bundles";
import { BundleCard } from "./bundle-card";

export function BundleDeals() {
  const { bundles, loading } = useBundles();
  if (loading || bundles.length === 0) return null;

  return (
    <section className="pt-6">
      <div className="flex items-center justify-between px-5">
        <h2 className="text-lg font-bold">Save more together</h2>
        <span className="text-xs font-semibold text-muted-foreground">Save more</span>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-1 no-scrollbar snap-x snap-mandatory">
        {bundles.map((b) => (
          <div key={b.id} className="w-44 flex-shrink-0 snap-start">
            <BundleCard bundle={b} />
          </div>
        ))}
      </div>
    </section>
  );
}
