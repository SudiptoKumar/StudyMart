import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, CheckCircle, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusPill, statusTone } from "@/components/admin/status-pill";
import { formatPrice } from "@/lib/format";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string;
  order_number: string;
  customer_email: string | null;
  customer_name: string | null;
  total_amount: number;
  status: string;
  delivery_status: string;
  payment_method: string | null;
  created_at: string;
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "delivered">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data ?? []) as Order[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markDelivered = async (id: string) => {
    const { error } = await supabase.from("orders").update({ delivery_status: "delivered" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked delivered");
    void logActivity("delivered_order", "order", id);
    load();
  };

  const filtered = orders
    .filter((o) => {
      if (filter === "all") return true;
      if (filter === "delivered") return o.delivery_status === "delivered";
      if (filter === "pending") return o.delivery_status === "pending";
      return o.status === filter;
    })
    .filter(
      (o) =>
        !search ||
        o.order_number.toLowerCase().includes(search.toLowerCase()) ||
        (o.customer_email ?? "").toLowerCase().includes(search.toLowerCase()),
    );

  return (
    <div className="space-y-5">
      <PageHeader title="Orders" subtitle={`${orders.length} total`} />

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-border bg-background px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order #, email…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-border bg-background p-1">
          {(["all", "pending", "completed", "delivered"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f === "pending" ? "Awaiting delivery" : f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ShoppingCart} title="No orders" description="Orders will show up here once customers check out." />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-bold">{o.order_number}</p>
                    <p className="truncate text-xs text-muted-foreground">{o.customer_email ?? "—"}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <p className="font-mono text-sm font-bold">{formatPrice(Number(o.total_amount), { decimals: 2 })}</p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Payment:</span>
                    <StatusPill tone={statusTone(o.status)}>{o.status}</StatusPill>
                    <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Delivery:</span>
                    <StatusPill tone={statusTone(o.delivery_status)}>
                      {o.delivery_status === "pending" ? "Awaiting delivery" : o.delivery_status}
                    </StatusPill>
                  </div>
                  {o.delivery_status !== "delivered" && o.status === "completed" && (
                    <button
                      onClick={() => markDelivered(o.id)}
                      title="Mark digital files as delivered to the customer"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Deliver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="admin-card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th className="text-right">Amount</th>
                    <th>Status</th>
                    <th>Delivery</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id}>
                      <td>
                        <div className="font-mono text-xs font-semibold">{o.order_number}</div>
                        <div className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</div>
                      </td>
                      <td>
                        <div className="text-xs font-semibold">{o.customer_name ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{o.customer_email ?? "—"}</div>
                      </td>
                      <td className="num">{formatPrice(Number(o.total_amount), { decimals: 2 })}</td>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Payment:</span>
                          <StatusPill tone={statusTone(o.status)}>{o.status}</StatusPill>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Delivery:</span>
                          <StatusPill tone={statusTone(o.delivery_status)}>
                            {o.delivery_status === "pending" ? "Awaiting delivery" : o.delivery_status}
                          </StatusPill>
                        </div>
                      </td>
                      <td>
                        {o.delivery_status !== "delivered" && o.status === "completed" && (
                          <button
                            onClick={() => markDelivered(o.id)}
                            title="Mark digital files as delivered to the customer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Deliver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
