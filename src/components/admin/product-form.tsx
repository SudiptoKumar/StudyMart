import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/admin/image-upload";
import { FileUpload } from "@/components/admin/file-upload";
import { PreviewUpload } from "@/components/admin/preview-upload";
import { formatFromFilename } from "@/lib/storage";
import { logActivity } from "@/lib/activity-log";

const CATEGORIES = ["Notes", "PDFs", "Prompts", "Courses", "Bundles"];

export type ProductFormValues = {
  id?: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: string;
  price: number;
  original_price: number | null;
  status: "draft" | "published";
  featured: boolean;
  delivery_type: "download" | "stream";
  format: string;
  image_url: string | null;
  file_url: string | null;
  file_name?: string | null;
  file_size?: number | null;
  preview_url?: string | null;
  preview_type?: "pdf" | "image" | "video" | null;
};

const empty: ProductFormValues = {
  slug: "",
  title: "",
  tagline: "",
  description: "",
  category: "Notes",
  price: 0,
  original_price: null,
  status: "draft",
  featured: false,
  delivery_type: "download",
  format: "",
  image_url: null,
  file_url: null,
  file_name: null,
  file_size: null,
  preview_url: null,
  preview_type: null,
};

const schema = z.object({
  title: z.string().trim().min(2, "Title is required").max(160),
  slug: z.string().trim().min(2, "Slug is required").max(120).regex(/^[a-z0-9-]+$/, "Use lowercase letters, numbers, and hyphens"),
  tagline: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().min(1),
  price: z.number().min(0, "Price must be ≥ 0"),
  original_price: z.number().min(0).nullable().optional(),
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function ProductForm({ initial }: { initial?: ProductFormValues }) {
  const navigate = useNavigate();
  const [v, setV] = useState<ProductFormValues>(initial ?? empty);
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Auto-slug from title until user manually edits the slug
  useEffect(() => {
    if (!slugTouched) {
      setV((prev) => ({ ...prev, slug: slugify(prev.title) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.title]);

  const validate = (publishing: boolean) => {
    const r = schema.safeParse(v);
    const errs: Record<string, string> = {};
    if (!r.success) {
      for (const issue of r.error.issues) {
        errs[String(issue.path[0])] = issue.message;
      }
    }
    if (publishing) {
      if (!v.image_url) errs.image_url = "Cover image is required to publish";
      if (v.delivery_type === "download" && !v.file_url) {
        errs.file_url = "Upload a digital file before publishing a download";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (status: "draft" | "published") => {
    const ok = validate(status === "published");
    if (!ok) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        slug: v.slug,
        title: v.title,
        tagline: v.tagline || null,
        description: v.description || null,
        category: v.category,
        price: Number(v.price) || 0,
        original_price: v.original_price ? Number(v.original_price) : null,
        status,
        featured: v.featured,
        delivery_type: v.delivery_type,
        format: v.format || (v.file_name ? formatFromFilename(v.file_name) : null),
        image_url: v.image_url,
        file_url: v.file_url,
        preview_url: v.preview_url ?? null,
        preview_type: v.preview_type ?? null,
      };
      if (v.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", v.id);
        if (error) throw error;
        void logActivity("updated_product", "product", v.id, { slug: v.slug, status });
      } else {
        const { data: inserted, error } = await supabase.from("products").insert(payload).select("id").single();
        if (error) throw error;
        void logActivity("created_product", "product", inserted?.id, { slug: v.slug, status });
      }
      toast.success(status === "published" ? "Published" : "Saved");
      navigate({ to: "/admin/products" });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
        <button
          onClick={() => navigate({ to: "/admin/products" })}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold">
            {v.id ? "Edit product" : "New product"}
          </div>
          <div className="text-xs text-muted-foreground">
            {v.status === "published" ? "Published" : "Draft"}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-32 pt-4">
        {/* Cover image */}
        <Section title="Cover photo" subtitle="Shown across the storefront. 4:3 looks best.">
          <ImageUpload
            value={v.image_url}
            onChange={(url) => setV({ ...v, image_url: url })}
          />
          {errors.image_url && <Err msg={errors.image_url} />}
        </Section>

        {/* Basics */}
        <Section title="Basics">
          <Field label="Title" error={errors.title}>
            <input
              value={v.title}
              onChange={(e) => setV({ ...v, title: e.target.value })}
              placeholder="e.g. NEET Biology Master Notes"
              className="input h-11"
            />
          </Field>

          <Field
            label="URL slug"
            error={errors.slug}
            hint="Auto-generated from the title. Tap to customise."
          >
            <input
              value={v.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setV({ ...v, slug: e.target.value });
              }}
              placeholder="neet-biology-notes"
              className="input h-11 font-mono text-sm"
            />
          </Field>

          <Field label="Tagline">
            <input
              value={v.tagline}
              onChange={(e) => setV({ ...v, tagline: e.target.value })}
              placeholder="One-line pitch"
              className="input h-11"
            />
          </Field>

          <Field label="Category">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setV({ ...v, category: c })}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    v.category === c
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (BDT ৳)" error={errors.price}>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={v.price}
                onChange={(e) => setV({ ...v, price: Number(e.target.value) })}
                className="input h-11 font-mono"
              />
            </Field>
            <Field label="Compare-at" hint="Original price">
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={v.original_price ?? ""}
                onChange={(e) =>
                  setV({
                    ...v,
                    original_price: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="—"
                className="input h-11 font-mono"
              />
            </Field>
          </div>
        </Section>

        {/* Description */}
        <Section title="Description">
          <Field label="What's inside?">
            <textarea
              value={v.description}
              onChange={(e) => setV({ ...v, description: e.target.value })}
              placeholder="What buyers get, page count, key chapters…"
              className="input min-h-32 py-3"
              maxLength={5000}
            />
            <div className="mt-1 text-right text-[11px] text-muted-foreground">
              {v.description.length} / 5000
            </div>
          </Field>
        </Section>

        {/* Digital file */}
        <Section title="Digital file" subtitle="The file your customers receive.">
          <FileUpload
            value={v.file_url}
            label={v.file_name}
            sizeBytes={v.file_size}
            onChange={(next) =>
              setV({
                ...v,
                file_url: next.path,
                file_name: next.name,
                file_size: next.size,
                format: v.format || next.format || "",
              })
            }
          />
          {errors.file_url && <Err msg={errors.file_url} />}
        </Section>

        {/* Preview / sample */}
        <Section
          title="Preview / sample"
          subtitle="Optional. Shoppers see this before purchase. PDF, image, or short video — up to 10 MB."
        >
          <PreviewUpload
            value={v.preview_url ?? null}
            type={v.preview_type ?? null}
            onChange={(next) =>
              setV({ ...v, preview_url: next.path, preview_type: next.type })
            }
          />
        </Section>

        {/* Delivery & format */}
        <Section title="Delivery & format">
          <Field label="Delivery type">
            <Segmented
              value={v.delivery_type}
              onChange={(val) => setV({ ...v, delivery_type: val as "download" | "stream" })}
              options={[
                { value: "download", label: "Download" },
                { value: "stream", label: "Stream" },
              ]}
            />
          </Field>
          <Field label="Format" hint="Auto-filled from your file. Editable.">
            <input
              value={v.format}
              onChange={(e) => setV({ ...v, format: e.target.value })}
              placeholder="PDF · ePub"
              className="input h-11"
            />
          </Field>
        </Section>

        {/* Visibility */}
        <Section title="Visibility">
          <Field label="Status">
            <Segmented
              value={v.status}
              onChange={(val) => setV({ ...v, status: val as "draft" | "published" })}
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
              ]}
            />
          </Field>
          <label className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
            <div>
              <div className="text-sm font-semibold">Feature on homepage</div>
              <div className="text-xs text-muted-foreground">
                Highlight in the featured carousel.
              </div>
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

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <div className="mx-auto flex max-w-2xl gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => navigate({ to: "/admin/products" })}
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

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
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

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex rounded-full bg-secondary p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
            value === o.value
              ? "bg-background text-foreground shadow-soft"
              : "text-muted-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
