import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, ShoppingCart, Users, Package, TrendingUp, AlertCircle, Inbox } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusPill, statusTone } from "@/components/admin/status-pill";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Stats = {
  revenue: number;
  orders: number;
  customers: number;
  products: number;
  pendingDeliveries: number;
  recentOrders: { id: string; order_number: string; total_amount: number; status: string; created_at: string; customer_email: string | null }[];
};

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const [orders, products, profiles] = await Promise.all([
        supabase.from("orders").select("id, order_number, total_amount, status, delivery_status, created_at, customer_email").order("created_at", { ascending: false }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const allOrders = orders.data ?? [];
      const revenue = allOrders.filter((o) => o.status === "completed").reduce((s, o) => s + Number(o.total_amount), 0);
      const pendingDeliveries = allOrders.filter((o) => o.delivery_status === "pending" && o.status === "completed").length;
      setStats({
        revenue,
        orders: allOrders.length,
        customers: profiles.count ?? 0,
        products: products.count ?? 0,
        pendingDeliveries,
        recentOrders: allOrders.slice(0, 5),
      });
    })();
  }, []);

  const cards = [
    { label: "Revenue", value: stats ? formatPrice(stats.revenue, { decimals: 2 }) : "—", icon: Wallet, accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600" },
    { label: "Orders", value: stats ? stats.orders.toString() : "—", icon: ShoppingCart, accent: "from-brand/15 to-brand/5 text-brand" },
    { label: "Customers", value: stats ? stats.customers.toString() : "—", icon: Users, accent: "from-sky-500/15 to-sky-500/5 text-sky-600" },
    { label: "Products", value: stats ? stats.products.toString() : "—", icon: Package, accent: "from-amber-500/15 to-amber-500/5 text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Welcome back, owner." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="admin-card relative overflow-hidden p-4">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <Icon className={`h-4 w-4 ${accent.split(" ").pop()}`} />
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {stats && stats.pendingDeliveries > 0 && (
        <Link
          to="/admin/orders"
          className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              {stats.pendingDeliveries} order{stats.pendingDeliveries === 1 ? "" : "s"} waiting to be delivered
            </span>
          </div>
          <span className="text-xs font-semibold">Process now →</span>
        </Link>
      )}

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Recent orders</h2>
          <Link to="/admin/orders" className="text-xs font-semibold text-brand hover:underline">
            View all
          </Link>
        </div>
        {!stats ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex-1 space-y-2">
                  <div className="admin-skeleton h-3 w-32" />
                  <div className="admin-skeleton h-2.5 w-48" />
                </div>
                <div className="admin-skeleton h-4 w-14" />
              </li>
            ))}
          </ul>
        ) : stats.recentOrders.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={Inbox} title="No orders yet" description="When customers place orders, they'll appear here." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {stats.recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{o.order_number}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.customer_email ?? "—"} · {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm font-bold">{formatPrice(Number(o.total_amount), { decimals: 2 })}</p>
                  <StatusPill tone={statusTone(o.status)}>{o.status}</StatusPill>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="admin-card p-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand" />
          <h2 className="text-sm font-semibold">Quick actions</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { to: "/admin/products/new", label: "Add product" },
            { to: "/admin/coupons", label: "Create coupon" },
            { to: "/admin/promos", label: "New promo" },
            { to: "/admin/banners", label: "Manage banners" },
          ].map((a) => (
            <Link key={a.to} to={a.to} className="rounded-xl bg-secondary p-3 text-center text-xs font-semibold transition-colors hover:bg-accent">
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
