import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Receipt, Zap, Lock, ArrowRight } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { RecentlyViewed } from "@/components/recently-viewed";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Cart — StudyMart" },
      { name: "description", content: "Your cart." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { detailed, setQty, remove, subtotal } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const goCheckout = () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
    } else {
      navigate({ to: "/checkout" });
    }
  };

  if (detailed.length === 0) {
    return (
      <div>
        <header className="flex items-center gap-3 px-5 pb-3 pt-4">
          <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <ArrowLeft className="h-[18px] w-[18px]" />
          </Link>
          <h1 className="text-xl font-bold">Cart</h1>
        </header>
        <div className="flex flex-col items-center justify-center px-6 pt-24 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <ShoppingBag className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h2 className="mt-6 text-xl font-bold">Your cart is empty</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Browse our catalogue and add something nice.
          </p>
          <Link
            to="/shop"
            className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Start browsing
          </Link>
        </div>
        <RecentlyViewed />
      </div>
    );
  }

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-background/85 px-5 pb-3 pt-4 backdrop-blur-lg">
        <Link to="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
        <h1 className="text-xl font-bold">Cart ({detailed.length})</h1>
      </header>

      <div className="space-y-3 px-5 pt-2">
        {detailed.map(({ product, qty }) => (
          <div key={product.slug} className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft transition-transform active:scale-[0.98]">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
              <img src={product.image} alt={product.title} className="h-full w-full object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand">
                    {product.category}
                  </p>
                  <h3 className="mt-0.5 text-sm font-semibold leading-tight">{product.title}</h3>
                </div>
                <button
                  onClick={() => remove(product.slug)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground"
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
                  <button
                    onClick={() => setQty(product.slug, qty - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-background"
                    aria-label="Decrease"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-6 text-center font-mono text-xs font-bold">{qty}</span>
                  <button
                    onClick={() => setQty(product.slug, qty + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-background"
                    aria-label="Increase"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="font-mono text-sm font-bold">{formatPrice(product.price * qty)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mx-5 mt-6 rounded-2xl bg-card p-4 shadow-soft">
        <h2 className="flex items-center gap-1.5 text-sm font-bold">
          <Receipt className="h-4 w-4 text-muted-foreground" /> Summary
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd className="font-mono font-semibold">{formatPrice(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Delivery</dt>
            <dd className="text-success flex items-center gap-1 font-semibold">
              <Zap className="h-3.5 w-3.5" /> Free
            </dd>
          </div>
          <div className="my-2 h-px bg-border" />
          <div className="flex items-baseline justify-between">
            <dt className="text-base font-bold">Total</dt>
            <dd className="font-mono text-xl font-bold">{formatPrice(subtotal)}</dd>
          </div>
        </dl>
      </div>

      {/* Sticky checkout bar */}
      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] pt-3 backdrop-blur-lg">
        <button
          onClick={goCheckout}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform active:opacity-90 active:scale-[0.98]"
        >
          <Lock className="h-4 w-4" /> Checkout · {formatPrice(subtotal)} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
