import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, X, Pencil, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusPill } from "@/components/admin/status-pill";
import { formatPrice } from "@/lib/format";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/admin/coupons")({
  component: AdminCoupons,
});

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_amount: number | null;
  max_uses: number | null;
  used_count: number;
  active: boolean;
  expires_at: string | null;
};

const empty: Partial<Coupon> = {
  code: "",
  description: "",
  discount_type: "percent",
  discount_value: 10,
  min_amount: 0,
  active: true,
};

function AdminCoupons() {
  const [items, setItems] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setItems((data ?? []) as Coupon[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.code || !editing.discount_value) {
      toast.error("Code and value are required");
      return;
    }
    const payload = {
      code: editing.code.toUpperCase(),
      description: editing.description ?? "",
      discount_type: editing.discount_type ?? "percent",
      discount_value: Number(editing.discount_value),
      min_amount: editing.min_amount ? Number(editing.min_amount) : 0,
      max_uses: editing.max_uses ? Number(editing.max_uses) : null,
      active: editing.active ?? true,
      expires_at: editing.expires_at || null,
    };
    if (editing.id) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Coupon updated");
      void logActivity("updated_coupon", "coupon", editing.id, { code: payload.code });
    } else {
      const { data: inserted, error } = await supabase.from("coupons").insert(payload).select("id").single();
      if (error) return toast.error(error.message);
      toast.success("Coupon created");
      void logActivity("created_coupon", "coupon", inserted?.id, { code: payload.code });
    }
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    void logActivity("deleted_coupon", "coupon", id);
    load();
  };

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <PageHeader
        title="Coupons"
        subtitle={`${items.length} total`}
        action={
          <button
            onClick={() => setEditing(empty)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New coupon
          </button>
        }
        fab={
          <button onClick={() => setEditing(empty)} className="admin-fab">
            <Plus className="h-5 w-5" /> New
          </button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-14 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No coupons yet"
          description="Create discount codes to share with your customers."
          action={
            <button onClick={() => setEditing(empty)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> New coupon
            </button>
          }
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {items.map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-base font-bold">{c.code}</p>
                    {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                  </div>
                  <StatusPill tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Inactive"}</StatusPill>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold">
                    {c.discount_type === "percent" ? `${c.discount_value}% off` : `${formatPrice(Number(c.discount_value), { decimals: 2 })} off`}
                  </span>
                  <span className="text-muted-foreground">
                    {c.used_count} used{c.max_uses ? ` / ${c.max_uses}` : ""}
                  </span>
                </div>
                <div className="mt-2 flex justify-end gap-1">
                  <button onClick={() => setEditing(c)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(c.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
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
                    <th>Code</th>
                    <th>Discount</th>
                    <th className="text-right">Used</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className="font-mono font-bold">{c.code}</div>
                        <div className="text-xs text-muted-foreground">{c.description}</div>
                      </td>
                      <td>{c.discount_type === "percent" ? `${c.discount_value}%` : formatPrice(Number(c.discount_value), { decimals: 2 })}</td>
                      <td className="num text-xs">{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                      <td><StatusPill tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Inactive"}</StatusPill></td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => setEditing(c)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => remove(c.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
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

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-md rounded-t-2xl bg-background p-6 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing.id ? "Edit coupon" : "New coupon"}</h2>
              <button onClick={() => setEditing(null)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Code">
                <input value={editing.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} className="input font-mono uppercase" placeholder="SAVE10" />
              </Field>
              <Field label="Description">
                <input value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={editing.discount_type ?? "percent"} onChange={(e) => setEditing({ ...editing, discount_type: e.target.value })} className="input">
                    <option value="percent">Percent (%)</option>
                    <option value="fixed">Fixed amount (৳)</option>
                  </select>
                </Field>
                <Field label="Value">
                  <input type="number" step="0.01" value={editing.discount_value ?? 0} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} className="input font-mono" />
                </Field>
                <Field label="Min order (৳)">
                  <input type="number" step="0.01" value={editing.min_amount ?? 0} onChange={(e) => setEditing({ ...editing, min_amount: Number(e.target.value) })} className="input font-mono" />
                </Field>
                <Field label="Max uses">
                  <input type="number" value={editing.max_uses ?? ""} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value ? Number(e.target.value) : null })} className="input font-mono" placeholder="Unlimited" />
                </Field>
              </div>
              <Field label="Expires at">
                <input type="datetime-local" value={editing.expires_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value || null })} className="input" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editing.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold">Cancel</button>
              <button onClick={save} className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
