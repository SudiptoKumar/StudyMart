import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block overflow-hidden rounded-2xl bg-card shadow-soft transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-2.5 top-2.5 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
          {product.category}
        </span>
      </div>
      <div className="p-3">
        <h3 className="truncate text-sm font-semibold">{product.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Star className="h-3 w-3 fill-current text-amber-500" strokeWidth={0} />
          <span className="font-medium text-foreground">{product.rating}</span>
          <span>· {product.sales.toLocaleString()} sold</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="font-mono text-base font-bold">{formatPrice(product.price)}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {product.delivery === "stream" ? "Stream" : "Download"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ProductRow({ product }: { product: Product }) {
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="flex gap-3 rounded-2xl bg-card p-2.5 shadow-soft transition-transform active:scale-[0.98]"
    >
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
        <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col justify-between py-0.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
            {product.category}
          </p>
          <h3 className="mt-0.5 text-sm font-semibold leading-tight">{product.title}</h3>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold">{formatPrice(product.price)}</span>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Star className="h-3 w-3 fill-current text-amber-500" strokeWidth={0} />
            <span className="font-medium text-foreground">{product.rating}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
