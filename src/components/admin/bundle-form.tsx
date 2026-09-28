import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Plus, X, GripVertical } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/image-upload";
import { logActivity } from "@/lib/activity-log";

export type BundleFormValues = {
  id?: string;
  slug: string;
  title: string;
  description: string;
  image_url: string | null;
  price: number;
  original_price: number | null;
  status: "draft" | "published";
  featured: boolean;
  item_slugs: string[];
};

const empty: BundleFormValues = {
  slug: "",
  title: "",
  description: "",
  image_url: null,
  price: 0,
  original_price: null,
  status: "draft",
  featured: false,
  item_slugs: [],
};

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(160),
  slug: z.string().trim().min(2, "Slug is required").max(120).regex(/^[a-z0-9-]+$/, "lowercase, numbers, hyphens"),
  price: z.number().min(0),
  original_price: z.number().min(0).nullable().optional(),
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

type ProductOption = { slug: string; title: string; price: number; image_url: string | null };

export function BundleForm({ initial }: { initial?: BundleFormValues }) {
  const navigate = useNavigate();
  const [v, setV] = useState<BundleFormValues>(initial ?? empty);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductOption[]>([]);
  const [itemDetails, setItemDetails] = useState<Record<string, ProductOption>>({});

  useEffect(() => {
    if (!slugTouched) setV((p) => ({ ...p, slug: slugify(p.title) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.title]);

  // Hydrate item details (for edit mode)
  useEffect(() => {
    const missing = v.item_slugs.filter((s) => !itemDetails[s]);
    if (!missing.length) return;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("slug, title, price, image_url")
        .in("slug", missing);
      setItemDetails((prev) => {
        const next = { ...prev };
        for (const r of (data ?? []) as ProductOption[]) next[r.slug] = r;
        return next;
      });
    })();
  }, [v.item_slugs, itemDetails]);

  // Search products
  useEffect(() => {
    const q = search.trim();
    if (!q) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("products")
        .select("slug, title, price, image_url")
        .eq("status", "published")
        .ilike("title", `%${q}%`)
        .limit(8);
      setResults((data ?? []) as ProductOption[]);
    }, 200);
    return () => clearTimeout(t);
  }, [search]);

  const itemsTotal = v.item_slugs.reduce((s, slug) => s + (itemDetails[slug]?.price ?? 0), 0);

  const addItem = (p: ProductOption) => {
    if (v.item_slugs.includes(p.slug)) return;
    setItemDetails((prev) => ({ ...prev, [p.slug]: p }));
    setV({ ...v, item_slugs: [...v.item_slugs, p.slug] });
    setSearch("");
    setResults([]);
  };

  const removeItem = (slug: string) => {
    setV({ ...v, item_slugs: v.item_slugs.filter((s) => s !== slug) });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...v.item_slugs];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setV({ ...v, item_slugs: next });
  };

  const validate = (publishing: boolean) => {
    const r = schema.safeParse(v);
    const errs: Record<string, string> = {};
    if (!r.success) for (const i of r.error.issues) errs[String(i.path[0])] = i.message;
    if (publishing) {
      if (!v.image_url) errs.image_url = "Cover image required";
      if (v.item_slugs.length < 2) errs.items = "Add at least 2 products";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (status: "draft" | "published") => {
    if (!validate(status === "published")) {
      toast.error("Fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: v.slug,
        title: v.title,
        description: v.description || null,
        image_url: v.image_url,
        price: Number(v.price) || 0,
        original_price: v.original_price ? Number(v.original_price) : itemsTotal || null,
        status,
        featured: v.featured,
      };

      let bundleId = v.id;
      const isNew = !bundleId;
      if (bundleId) {
        const { error } = await supabase.from("bundles").update(payload).eq("id", bundleId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("bundles").insert(payload).select("id").single();
        if (error) throw error;
        bundleId = data.id;
      }

      // Replace items
      await supabase.from("bundle_items").delete().eq("bundle_id", bundleId!);
      if (v.item_slugs.length) {
        const rows = v.item_slugs.map((s, i) => ({
          bundle_id: bundleId!,
          product_slug: s,
          position: i,
        }));
        const { error: e2 } = await supabase.from("bundle_items").insert(rows);
        if (e2) throw e2;
      }

      void logActivity(isNew ? "created_bundle" : "updated_bundle", "bundle", bundleId!, { slug: v.slug, status });
      toast.success(status === "published" ? "Published" : "Saved");
      navigate({ to: "/admin/bundles" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/admin/bundles" })}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">{v.id ? "Edit bundle" : "New bundle"}</div>
          <div className="text-xs text-muted-foreground">{v.status === "published" ? "Published" : "Draft"}</div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-32 pt-4">
        <Section title="Cover image">
          <ImageUpload value={v.image_url} onChange={(url) => setV({ ...v, image_url: url })} />
          {errors.image_url && <Err msg={errors.image_url} />}
        </Section>

        <Section title="Basics">
          <Field label="Title" error={errors.title}>
            <input
              value={v.title}
              onChange={(e) => setV({ ...v, title: e.target.value })}
              placeholder="Ultimate JEE Bundle"
              className="input h-11"
            />
          </Field>
          <Field label="URL slug" error={errors.slug}>
            <input
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setV({ ...v, slug: e.target.value });
              }}
              className="input h-11 font-mono text-sm"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
              className="input min-h-24 py-3"
              maxLength={2000}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bundle price (BDT ৳)" error={errors.price}>
              <input
                type="number"
                step="0.01"
                value={v.price}
                onChange={(e) => setV({ ...v, price: Number(e.target.value) })}
                className="input h-11 font-mono"
              />
            </Field>
            <Field label="Compare-at" hint={`Sum: ৳${itemsTotal.toFixed(2)}`}>
              <input
                type="number"
                step="0.01"
                value={v.original_price ?? ""}
                onChange={(e) =>
                  setV({ ...v, original_price: e.target.value ? Number(e.target.value) : null })
                }
                placeholder={itemsTotal ? itemsTotal.toFixed(2) : "—"}
                className="input h-11 font-mono"
              />
            </Field>
          </div>
        </Section>

        <Section title="Products in bundle" subtitle="Add the products customers receive.">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products to add…"
              className="input h-11"
            />
            {results.length > 0 && (
              <div className="absolute inset-x-0 top-12 z-10 max-h-64 overflow-y-auto rounded-2xl border border-border bg-background shadow-card">
                {results.map((r) => (
                  <button
                    key={r.slug}
                    type="button"
                    onClick={() => addItem(r)}
                    disabled={v.item_slugs.includes(r.slug)}
                    className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-secondary/50 disabled:opacity-40"
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                      {r.image_url && <img src={r.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{r.title}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">৳{Number(r.price).toFixed(2)}</p>
                    </div>
                    <Plus className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {errors.items && <Err msg={errors.items} />}

          <div className="space-y-2">
            {v.item_slugs.map((slug, idx) => {
              const p = itemDetails[slug];
              return (
                <div key={slug} className="flex items-center gap-2 rounded-xl border border-border bg-card p-2">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => move(idx, -1)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Move up"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-secondary">
                    {p?.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p?.title ?? slug}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      ৳{Number(p?.price ?? 0).toFixed(2)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(slug)}
                    className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                    aria-label="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Visibility">
          <div className="flex rounded-full bg-secondary p-1">
            {(["draft", "published"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setV({ ...v, status: s })}
                className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold capitalize transition ${
                  v.status === s ? "bg-background text-foreground shadow-soft" : "text-muted-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <div className="text-sm font-semibold">Feature on homepage</div>
            </div>
            <input
              type="checkbox"
              checked={v.featured}
              onChange={(e) => setV({ ...v, featured: e.target.checked })}
              className="h-5 w-5 accent-primary"
            />
          </label>
        </Section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => navigate({ to: "/admin/bundles" })}
            className="flex-1 rounded-full border border-border py-3 text-sm font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("draft")}
            className="flex-1 rounded-full border border-border bg-secondary py-3 text-sm font-semibold disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("published")}
            className="flex flex-[1.2] items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && !error && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      {error && <Err msg={error} />}
    </label>
  );
}

function Err({ msg }: { msg: string }) {
  return <div className="mt-1 text-[11px] font-medium text-destructive">{msg}</div>;
}
