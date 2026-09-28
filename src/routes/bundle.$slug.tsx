import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ShoppingBag, Check, Package } from "lucide-react";
import { fetchBundleBySlug, type BundleWithItems } from "@/lib/bundles";
import { useCart } from "@/lib/cart";
import { ProductRow } from "@/components/product-card";
import { resolveImage } from "@/lib/products";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/bundle/$slug")({
  loader: async ({ params }) => {
    const bundle = await fetchBundleBySlug(params.slug);
    if (!bundle) throw notFound();
    return { bundle };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.bundle.title} | Bundle` },
          { name: "description", content: loaderData.bundle.description ?? "" },
          { property: "og:title", content: loaderData.bundle.title },
          { property: "og:description", content: loaderData.bundle.description ?? "" },
          ...(loaderData.bundle.image_url
            ? [{ property: "og:image", content: loaderData.bundle.image }]
            : []),
        ]
      : [],
  }),
  component: BundlePage,
  notFoundComponent: () => (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-bold">Bundle not found</h1>
      <Link to="/shop" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
        Back to shop
      </Link>
    </div>
  ),
});

function BundlePage() {
  const { bundle: initial } = Route.useLoaderData();
  const [bundle] = useState<BundleWithItems>(initial);
  const navigate = useNavigate();
  const { add, replace } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setAdded(false);
  }, [bundle.slug]);

  const addAllItems = () => {
    for (const p of bundle.items) add(p.slug);
  };

  const addBundle = () => {
    if (!bundle.items.length) return;
    addAllItems();
    setAdded(true);
    toast.success(`${bundle.items.length} items added to cart`);
  };

  const buyNow = () => {
    if (!bundle.items.length) return;
    replace(bundle.items.map((item) => ({ slug: item.slug, qty: 1 })));
    navigate({ to: "/checkout" });
  };

  return (
    <div className="pb-32">
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
        {bundle.image_url ? (
          <img src={bundle.image} alt={bundle.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center gradient-brand">
            <Package className="h-20 w-20 text-white/80" />
          </div>
        )}
        <button
          onClick={() => navigate({ to: "/shop" })}
          className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-background/90 backdrop-blur"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {bundle.savings > 0 && (
          <span className="absolute right-4 top-4 rounded-full bg-destructive px-3 py-1 text-xs font-bold text-destructive-foreground">
            Save {formatPrice(bundle.savings)}
          </span>
        )}
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-background px-5 pb-4 pt-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand">
          <Package className="h-3 w-3" /> Bundle · {bundle.items.length} items
        </span>
        <h1 className="mt-3 text-2xl font-bold leading-tight">{bundle.title}</h1>
        {bundle.description && (
          <p className="mt-2 text-sm text-muted-foreground">{bundle.description}</p>
        )}

        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-mono text-3xl font-bold">{formatPrice(bundle.price)}</span>
          {bundle.itemsTotal > bundle.price && (
            <>
              <span className="font-mono text-base text-muted-foreground line-through">
                {formatPrice(bundle.itemsTotal)}
              </span>
              <span className="text-xs font-bold text-brand">
                Save {formatPrice(bundle.savings)}
              </span>
            </>
          )}
        </div>
      </div>

      <section className="mt-6 px-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          What's inside
        </h2>
        <div className="mt-3 space-y-2.5">
          {bundle.items.map((p) => (
            <ProductRow key={p.slug} product={p} />
          ))}
          {bundle.items.length === 0 && (
            <p className="text-sm text-muted-foreground">No items in this bundle yet.</p>
          )}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            onClick={addBundle}
            className={`flex flex-1 items-center justify-center gap-2 rounded-full border py-3 text-sm font-semibold transition ${
              added ? "border-brand bg-brand-soft text-brand" : "border-border bg-background"
            }`}
          >
            {added ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            {added ? "Added" : "Add to cart"}
          </button>
          <button
            onClick={buyNow}
            className="flex flex-[1.2] items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            Buy bundle
          </button>
        </div>
      </div>
    </div>
  );
}
