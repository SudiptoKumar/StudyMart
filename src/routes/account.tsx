import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LogOut,
  ChevronRight,
  ShoppingBag,
  Library,
  HelpCircle,
  Mail,
  Shield,
  BellRing,
  Trash2,
  LayoutDashboard,
  Receipt,
  Package,
  Eraser,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAllAlerts } from "@/lib/price-alerts";
import { useIsAdmin } from "@/lib/use-role";
import { formatPrice } from "@/lib/format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type OrderRow = {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Account — StudyMart" },
      { name: "description", content: "Manage your account." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [clearing, setClearing] = useState(false);
  const { items: alerts, remove: removeAlert } = useAllAlerts();
  const { isAdmin } = useIsAdmin();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", search: { redirect: "/account" } });
  }, [user, loading, navigate]);

  const loadOrders = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .is("hidden_at", null)
      .order("created_at", { ascending: false })
      .limit(5);
    setOrders((data as OrderRow[]) ?? []);
  };

  useEffect(() => {
    if (!user) return;
    void loadOrders();
  }, [user]);

  if (!user) return null;

  const name = (user.user_metadata?.display_name as string) || user.email?.split("@")[0] || "Friend";
  const initial = name.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate({ to: "/" });
  };

  const handleClearHistory = async () => {
    if (!user) return;
    setClearing(true);
    try {
      const now = new Date().toISOString();
      const [{ error: e1 }, { error: e2 }] = await Promise.all([
        supabase.from("orders").update({ hidden_at: now }).eq("user_id", user.id).is("hidden_at", null),
        supabase.from("order_items").update({ hidden_at: now }).eq("user_id", user.id).is("hidden_at", null),
      ]);
      if (e1 || e2) throw e1 ?? e2;
      toast.success("Purchase history cleared");
      setOrders([]);
    } catch {
      toast.error("Could not clear history");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div>
      <header className="px-5 pb-3 pt-4">
        <h1 className="text-2xl font-bold tracking-tight">Account</h1>
      </header>

      {/* Profile card — simple white card on geometric grid */}
      <div className="mx-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          {/* Geometric grid pattern background */}
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              backgroundImage: `linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
                                linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
              maskImage: "radial-gradient(ellipse at top right, black 30%, transparent 75%)",
              WebkitMaskImage: "radial-gradient(ellipse at top right, black 30%, transparent 75%)",
            }}
          />
          <div className="relative flex items-center gap-4 p-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-xl font-bold text-foreground">
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-base font-bold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <section className="mt-6 px-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <Receipt className="h-4 w-4 text-muted-foreground" /> Recent orders
          </h2>
          <Link to="/library" className="text-xs font-semibold text-brand">
            View all
          </Link>
        </div>
        {orders.length === 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">No orders yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {orders.map((o) => (
              <Link
                key={o.id}
                to="/order/$id"
                params={{ id: o.id }}
                className="flex items-center justify-between rounded-2xl bg-card p-3 shadow-soft transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-mono text-xs font-bold">{o.order_number}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold">{formatPrice(Number(o.total_amount))}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {orders.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-xs font-semibold text-muted-foreground transition active:scale-[0.98]"
                disabled={clearing}
              >
                <Eraser className="h-3.5 w-3.5" />
                {clearing ? "Clearing…" : "Clear purchase history"}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear purchase history?</AlertDialogTitle>
                <AlertDialogDescription>
                  Your past orders and library items will be hidden from your account. Admin records are kept.
                  This can't be undone from your side.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearHistory}>Clear</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </section>

      {/* Price alerts */}
      {alerts.length > 0 && (
        <section className="mt-6 px-5">
          <h2 className="flex items-center gap-1.5 text-sm font-bold">
            <BellRing className="h-4 w-4 text-muted-foreground" /> Price alerts
          </h2>
          <div className="mt-3 space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                  <BellRing className="h-4 w-4" />
                </div>
                <Link
                  to="/product/$slug"
                  params={{ slug: a.product_slug }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-sm font-semibold">{a.product_title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {a.target_price === null
                      ? "Notify on any drop"
                      : `Notify below ${formatPrice(Number(a.target_price), { decimals: 2 })}`}
                    {" · "}
                    Now {formatPrice(a.product_price, { decimals: 2 })}
                  </p>
                </Link>
                <button
                  onClick={() => {
                    void removeAlert(a.id);
                    toast.success("Alert removed");
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                  aria-label="Remove alert"
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Menu */}
      <section className="mt-6 px-5">
        {isAdmin && (
          <Link
            to="/admin"
            className="mb-3 flex items-center gap-3 overflow-hidden rounded-2xl bg-card px-4 py-3.5 shadow-soft"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
              <LayoutDashboard className="h-[18px] w-[18px]" />
            </div>
            <span className="flex-1 text-sm font-semibold">Admin panel</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        )}
        <div className="overflow-hidden rounded-2xl bg-card shadow-soft">
          {[
            { icon: Library, label: "My library", to: "/library" as const },
            { icon: ShoppingBag, label: "Cart", to: "/cart" as const },
          ].map((it, i) => (
            <Link
              key={it.label}
              to={it.to}
              className={`flex items-center gap-3 px-4 py-3.5 transition-transform active:scale-[0.98] ${i > 0 ? "border-t border-border" : ""}`}
            >
              <it.icon className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="flex-1 text-sm font-semibold">{it.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl bg-card shadow-soft">
          {[
            { icon: HelpCircle, label: "Help & support" },
            { icon: Mail, label: "Contact us" },
            { icon: Shield, label: "Privacy & terms" },
          ].map((it, i) => (
            <button
              key={it.label}
              className={`flex w-full items-center gap-3 px-4 py-3.5 text-left ${
                i > 0 ? "border-t border-border" : ""
              }`}
            >
              <it.icon className="h-[18px] w-[18px] text-muted-foreground" />
              <span className="flex-1 text-sm font-semibold">{it.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </section>

      <div className="px-5 pt-6">
        <button
          onClick={handleSignOut}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-secondary text-sm font-semibold text-destructive"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
