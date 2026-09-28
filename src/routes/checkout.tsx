import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, CreditCard, Wallet, Apple, Lock, Tag, Loader2, X, Check, ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatPrice } from "@/lib/format";

type CouponResponse =
  | { ok: true; code: string; discountAmount: number; description: string | null }
  | { ok: false; error: string };

type OrderResponse = { ok: true; orderId: string } | { ok: false; error: string };

async function postJson<T>(url: string, body: unknown, token?: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  return res.json() as Promise<T>;
}

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — StudyMart" },
      { name: "description", content: "Complete your purchase." },
    ],
  }),
  component: CheckoutPage,
});

type PaymentMethod = "card" | "apple" | "wallet";
type AppliedCoupon = { code: string; discountAmount: number; description: string | null };

function CheckoutPage() {
  const { detailed, subtotal, clear } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [processing, setProcessing] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/auth", search: { redirect: "/checkout" } });
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!processing && detailed.length === 0) {
      navigate({ to: "/cart" });
    }
  }, [detailed.length, navigate, processing]);

  // Recalculate discount if subtotal changes (items added/removed)
  useEffect(() => {
    if (!applied) return;
    if (subtotal === 0) {
      setApplied(null);
      return;
    }
    // Re-validate silently
    postJson<CouponResponse>("/api/coupons/validate", { code: applied.code, subtotal })
      .then((res) => {
        if (res.ok) {
          setApplied({ code: res.code, discountAmount: res.discountAmount, description: res.description });
        } else {
          setApplied(null);
          toast.info(`Coupon removed: ${res.error}`);
        }
      })
      .catch(() => { /* ignore */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  if (!user || detailed.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setApplyingCoupon(true);
    try {
      const res = await postJson<CouponResponse>("/api/coupons/validate", { code, subtotal });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setApplied({ code: res.code, discountAmount: res.discountAmount, description: res.description });
      setCouponInput("");
      toast.success(`Coupon applied: −${formatPrice(res.discountAmount, { decimals: 2 })}`);
    } catch {
      toast.error("Could not validate coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const total = Math.max(0, subtotal - (applied?.discountAmount ?? 0));

  const handlePay = async () => {
    setProcessing(true);
    try {
      // Attach auth token so server fn middleware sees it
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Not signed in");

      const clientMeta = {
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        language: typeof navigator !== "undefined" ? navigator.language : null,
        referrer: typeof document !== "undefined" ? document.referrer : null,
        screen:
          typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : null,
      };

      const result = await postJson<OrderResponse>(
        "/api/orders/create",
        {
          items: detailed.map(({ product, qty }) => ({ slug: product.slug, qty })),
          couponCode: applied?.code ?? null,
          paymentMethod: method,
          clientMeta,
        },
        session.access_token,
      );

      if (!result.ok) {
        toast.error(result.error || "Payment failed. Try again.");
        setProcessing(false);
        return;
      }

      await new Promise((r) => setTimeout(r, 600));

      clear();
      toast.success("Payment successful");
      navigate({ to: "/order/$id", params: { id: result.orderId } });
    } catch (e) {
      console.error(e);
      toast.error((e as Error).message || "Payment failed. Try again.");
      setProcessing(false);
    }
  };

  const methods: { id: PaymentMethod; label: string; sub: string; icon: typeof CreditCard }[] = [
    { id: "card", label: "Card", sub: "Visa, Mastercard, Amex", icon: CreditCard },
    { id: "apple", label: "Apple Pay", sub: "Touch / Face ID", icon: Apple },
    { id: "wallet", label: "Wallet", sub: "PayPal, Google Pay", icon: Wallet },
  ];

  return (
    <div>
      <header className="sticky top-0 z-40 flex items-center gap-3 bg-background/85 px-5 pb-3 pt-4 backdrop-blur-lg">
        <Link to="/cart" className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
          <ArrowLeft className="h-[18px] w-[18px]" />
        </Link>
        <h1 className="text-xl font-bold">Checkout</h1>
      </header>

      <div className="px-5 pt-2">
        {/* Items */}
        <section>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <ShoppingBag className="h-3.5 w-3.5" /> Order ({detailed.length})
          </h2>
          <div className="mt-2 space-y-2">
            {detailed.map(({ product, qty }) => (
              <div key={product.slug} className="flex items-center gap-3 rounded-2xl bg-card p-2.5 shadow-soft">
                <div className="h-12 w-12 overflow-hidden rounded-lg bg-secondary">
                  <img src={product.image} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 truncate">
                  <p className="truncate text-sm font-semibold">{product.title}</p>
                  <p className="text-xs text-muted-foreground">Qty {qty}</p>
                </div>
                <span className="font-mono text-sm font-bold">{formatPrice(product.price * qty)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Coupon */}
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Tag className="h-3.5 w-3.5" /> Coupon
          </h2>
          {applied ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl border-2 border-success bg-success/5 p-3 animate-in zoom-in-95 duration-200">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white">
                <Check className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold">{applied.code}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {applied.description ?? "Discount applied"}
                </p>
              </div>
              <button
                onClick={() => setApplied(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary"
                aria-label="Remove coupon"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter code"
                  maxLength={64}
                  className="h-11 w-full rounded-2xl bg-card pl-9 pr-3 font-mono text-sm outline-none shadow-soft placeholder:text-muted-foreground placeholder:font-sans focus:ring-2 focus:ring-brand"
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                />
              </div>
              <button
                onClick={applyCoupon}
                disabled={applyingCoupon || !couponInput.trim()}
                className="flex h-11 items-center gap-1.5 rounded-2xl bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
              >
                {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
              </button>
            </div>
          )}
        </section>

        {/* Payment method */}
        <section className="mt-6">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" /> Payment method
          </h2>
          <div className="mt-2 space-y-2">
            {methods.map(({ id, label, sub, icon: Icon }) => {
              const active = method === id;
              return (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors ${
                    active ? "border-brand bg-accent" : "border-transparent bg-card shadow-soft"
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      active ? "bg-brand text-primary-foreground" : "bg-secondary text-foreground"
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <div
                    className={`h-5 w-5 rounded-full border-2 ${
                      active ? "border-brand bg-brand" : "border-border"
                    }`}
                  >
                    {active && <div className="m-auto mt-0.5 h-2 w-2 rounded-full bg-primary-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Totals */}
        <section className="mt-6 rounded-2xl bg-card p-4 shadow-soft">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-mono font-semibold">{formatPrice(subtotal, { decimals: 2 })}</span>
          </div>
          {applied && (
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Discount ({applied.code})</span>
              <span className="text-success font-mono font-semibold">−{formatPrice(applied.discountAmount, { decimals: 2 })}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Delivery</span>
            <span className="text-success font-semibold">Free</span>
          </div>
          <div className="my-3 h-px bg-border" />
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold">Total</span>
            <span className="font-mono text-xl font-bold">{formatPrice(total, { decimals: 2 })}</span>
          </div>
        </section>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" /> Secured by StudyMart · Mock checkout
        </p>
      </div>

      <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-border bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom,0px)+88px)] pt-3 backdrop-blur-lg">
        <button
          onClick={handlePay}
          disabled={processing}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground transition-transform active:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing payment…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" /> Pay {formatPrice(total, { decimals: 2 })}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
