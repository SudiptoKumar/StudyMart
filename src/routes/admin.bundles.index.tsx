import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Package, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusPill, statusTone } from "@/components/admin/status-pill";
import { formatPrice } from "@/lib/format";

type AdminBundle = {
  id: string;
  slug: string;
  title: string;
  price: number;
  original_price: number | null;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/admin/bundles/")({
  component: AdminBundlesPage,
});

function AdminBundlesPage() {
  const [items, setItems] = useState<AdminBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("bundles")
        .select("id, slug, title, price, original_price, status, created_at")
        .order("created_at", { ascending: false });
      setItems((data as AdminBundle[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <PageHeader
        title="Bundles"
        subtitle="Group products into discounted bundles."
        action={
          <Link
            to="/admin/bundles/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New bundle
          </Link>
        }
        fab={
          <Link to="/admin/bundles/new" className="admin-fab">
            <Plus className="h-5 w-5" /> New
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-16 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No bundles yet"
          description="Create one to start selling product packs."
          action={
            <Link to="/admin/bundles/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> New bundle
            </Link>
          }
        />
      ) : (
        <div className="admin-card overflow-hidden">
          {items.map((b, i) => (
            <Link
              key={b.id}
              to="/admin/bundles/$id/edit"
              params={{ id: b.id }}
              className={`flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Package className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{b.title}</p>
                <p className="font-mono text-[11px] text-muted-foreground">/{b.slug}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-mono text-sm font-bold">{formatPrice(b.price)}</p>
                <StatusPill tone={statusTone(b.status)}>{b.status}</StatusPill>
              </div>
              <Pencil className="hidden h-4 w-4 text-muted-foreground sm:block" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
