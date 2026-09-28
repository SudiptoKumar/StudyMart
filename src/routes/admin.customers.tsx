import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
});

type Customer = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  order_count?: number;
  total_spent?: number;
};

function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [profiles, orders] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id, total_amount, status"),
      ]);
      const stats: Record<string, { count: number; total: number }> = {};
      (orders.data ?? []).forEach((o) => {
        if (!stats[o.user_id]) stats[o.user_id] = { count: 0, total: 0 };
        stats[o.user_id].count += 1;
        if (o.status === "completed") stats[o.user_id].total += Number(o.total_amount);
      });
      setCustomers(
        (profiles.data ?? []).map((p) => ({
          ...(p as Customer),
          order_count: stats[p.user_id]?.count ?? 0,
          total_spent: stats[p.user_id]?.total ?? 0,
        })),
      );
      setLoading(false);
    })();
  }, []);

  const filtered = customers.filter(
    (c) => !search || (c.display_name ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Customers" subtitle={`${customers.length} total`} />

      <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="No customers" description="When users sign up, they'll appear here." />
      ) : (
        <>
          {/* Mobile list */}
          <div className="space-y-2 md:hidden">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold uppercase text-brand">
                  {(c.display_name ?? "?")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.display_name ?? "Anonymous"}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.order_count} order{c.order_count === 1 ? "" : "s"} · joined {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="font-mono text-sm font-semibold">{formatPrice(c.total_spent ?? 0, { decimals: 2 })}</div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="admin-card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="text-right">Orders</th>
                    <th className="text-right">Spent</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-xs font-bold uppercase text-brand">
                            {(c.display_name ?? "?")[0]}
                          </div>
                          <div>
                            <div className="text-sm font-semibold">{c.display_name ?? "Anonymous"}</div>
                            <div className="font-mono text-[10px] text-muted-foreground">{c.user_id.slice(0, 8)}…</div>
                          </div>
                        </div>
                      </td>
                      <td className="num text-xs">{c.order_count}</td>
                      <td className="num">{formatPrice(c.total_spent ?? 0, { decimals: 2 })}</td>
                      <td className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
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
