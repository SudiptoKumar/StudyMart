import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search, Package as PackageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { resolveImage } from "@/lib/products";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusPill, statusTone } from "@/components/admin/status-pill";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/products/")({
  component: AdminProducts,
});

type ProductRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  price: number;
  status: string;
  featured: boolean;
  delivery_type: string;
  format: string | null;
  image_url: string | null;
  sales_count: number;
};

function AdminProducts() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id,slug,title,category,price,status,featured,delivery_type,format,image_url,sales_count")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as ProductRow[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (p) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  );

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  const ProductBadges = ({ p }: { p: ProductRow }) => (
    <div className="flex flex-wrap items-center gap-1">
      <StatusPill tone={statusTone(p.status)}>{p.status}</StatusPill>
      {p.featured && <StatusPill tone="brand">Featured</StatusPill>}
    </div>
  );

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <PageHeader
        title="Products"
        subtitle={`${items.length} total`}
        action={
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New product
          </Link>
        }
        fab={
          <Link to="/admin/products/new" className="admin-fab">
            <Plus className="h-5 w-5" /> New
          </Link>
        }
      />

      <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          title={items.length === 0 ? "No products yet" : "No matches"}
          description={items.length === 0 ? "Create your first product to start selling." : "Try a different search term."}
          action={
            items.length === 0 && (
              <Link to="/admin/products/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> New product
              </Link>
            )
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => navigate({ to: "/admin/products/$id/edit", params: { id: p.id } })}
                className="flex w-full gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-colors active:bg-secondary"
              >
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
                  <img src={resolveImage(p.image_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{p.title}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{p.category}</div>
                    </div>
                    <div className="text-right font-mono text-sm font-semibold">{formatPrice(Number(p.price), { decimals: 2 })}</div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <ProductBadges p={p} />
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(p.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-destructive active:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop table */}
          <div className="admin-card hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th className="text-right">Price</th>
                    <th>Status</th>
                    <th className="text-right">Sales</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => navigate({ to: "/admin/products/$id/edit", params: { id: p.id } })}
                      className="cursor-pointer"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                            <img src={resolveImage(p.image_url)} alt="" className="h-full w-full object-cover" loading="lazy" />
                          </div>
                          <div>
                            <div className="font-semibold">{p.title}</div>
                            <div className="text-xs text-muted-foreground">{p.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-xs">{p.category}</td>
                      <td className="num">{formatPrice(Number(p.price), { decimals: 2 })}</td>
                      <td>
                        <ProductBadges p={p} />
                      </td>
                      <td className="num text-xs">{p.sales_count}</td>
                      <td>
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Link
                            to="/admin/products/$id/edit"
                            params={{ id: p.id }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => remove(p.id)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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
