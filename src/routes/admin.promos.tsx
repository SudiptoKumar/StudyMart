import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, X, Pencil, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { StatusPill } from "@/components/admin/status-pill";

export const Route = createFileRoute("/admin/promos")({
  component: AdminPromos,
});

type Promo = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  position: number;
};

const empty: Partial<Promo> = {
  title: "",
  subtitle: "",
  cta_label: "Shop now",
  cta_url: "/shop",
  active: true,
  position: 0,
};

function AdminPromos() {
  const [items, setItems] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Promo> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("promotions").select("*").order("position", { ascending: true });
    setItems((data ?? []) as Promo[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing?.title) return toast.error("Title required");
    const payload = {
      title: editing.title,
      subtitle: editing.subtitle ?? "",
      cta_label: editing.cta_label ?? "",
      cta_url: editing.cta_url ?? "",
      image_url: editing.image_url ?? null,
      active: editing.active ?? true,
      starts_at: editing.starts_at || null,
      ends_at: editing.ends_at || null,
      position: editing.position ?? 0,
    };
    if (editing.id) {
      const { error } = await supabase.from("promotions").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
      toast.success("Promo updated");
    } else {
      const { error } = await supabase.from("promotions").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Promo created");
    }
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    const { error } = await supabase.from("promotions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <PageHeader
        title="Promotions"
        subtitle={`${items.length} total`}
        action={
          <button onClick={() => setEditing(empty)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90">
            <Plus className="h-4 w-4" /> New promotion
          </button>
        }
        fab={
          <button onClick={() => setEditing(empty)} className="admin-fab">
            <Plus className="h-5 w-5" /> New
          </button>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-32 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No promotions yet"
          description="Create promo cards to highlight deals on the home page."
          action={
            <button onClick={() => setEditing(empty)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> New promotion
            </button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
              <div className="gradient-brand p-5 text-white">
                <h3 className="text-lg font-bold">{p.title}</h3>
                {p.subtitle && <p className="mt-1 text-sm text-white/80">{p.subtitle}</p>}
              </div>
              <div className="flex items-center justify-between p-3">
                <StatusPill tone={p.active ? "success" : "neutral"}>{p.active ? "Live" : "Hidden"}</StatusPill>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(p)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(p.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-md rounded-t-2xl bg-background p-6 shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing.id ? "Edit promo" : "New promo"}</h2>
              <button onClick={() => setEditing(null)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <Field label="Title">
                <input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} className="input" />
              </Field>
              <Field label="Subtitle">
                <input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} className="input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="CTA label">
                  <input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} className="input" />
                </Field>
                <Field label="CTA URL">
                  <input value={editing.cta_url ?? ""} onChange={(e) => setEditing({ ...editing, cta_url: e.target.value })} className="input font-mono text-xs" />
                </Field>
                <Field label="Starts at">
                  <input type="datetime-local" value={editing.starts_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, starts_at: e.target.value || null })} className="input" />
                </Field>
                <Field label="Ends at">
                  <input type="datetime-local" value={editing.ends_at?.slice(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, ends_at: e.target.value || null })} className="input" />
                </Field>
              </div>
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
