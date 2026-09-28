import { Link } from "@tanstack/react-router";
import { Package } from "lucide-react";
import type { Bundle } from "@/lib/bundles";
import { formatPrice } from "@/lib/format";

export function BundleCard({ bundle }: { bundle: Bundle }) {
  const savings =
    bundle.original_price && bundle.original_price > bundle.price
      ? Math.round(((bundle.original_price - bundle.price) / bundle.original_price) * 100)
      : 0;

  return (
    <Link
      to="/bundle/$slug"
      params={{ slug: bundle.slug }}
      className="block overflow-hidden rounded-2xl bg-card shadow-soft transition active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {bundle.image_url ? (
          <img src={bundle.image} alt={bundle.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary">
            <Package className="h-10 w-10 text-primary-foreground/80" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand backdrop-blur">
          Bundle
        </span>
        {savings > 0 && (
          <span className="absolute right-2 top-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
            -{savings}%
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-bold leading-tight">{bundle.title}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-base font-bold">{formatPrice(bundle.price)}</span>
          {bundle.original_price && bundle.original_price > bundle.price && (
            <span className="font-mono text-xs text-muted-foreground line-through">
              {formatPrice(bundle.original_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
