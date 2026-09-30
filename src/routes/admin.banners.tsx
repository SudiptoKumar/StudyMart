import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Copy, Images } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAllBanners,
  fetchBannerInterval,
  saveBannerInterval,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
  type HeroBanner,
  type HeroBannerInput,
} from "@/lib/banners";
import { BannerForm } from "@/components/admin/banner-form";
import { BannerPreview, generateEmbedCode } from "@/components/admin/banner-preview";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/admin/banners")({
  head: () => ({ meta: [{ title: "Banners — Admin" }] }),
  component: BannersPage,
});

function BannersPage() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [interval, setInterval] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<HeroBanner | "new" | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [list, iv] = await Promise.all([fetchAllBanners(), fetchBannerInterval()]);
    setBanners(list);
    setInterval(iv);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (data: HeroBannerInput) => {
    if (editing === "new") {
      const created = await createBanner({ ...data, position: banners.length });
      toast.success("Banner created");
      void logActivity("created_banner", "banner", (created as { id?: string } | undefined)?.id);
    } else if (editing) {
      await updateBanner(editing.id, data);
      toast.success("Banner updated");
      void logActivity("updated_banner", "banner", editing.id);
    }
    setEditing(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await deleteBanner(id);
      toast.success("Deleted");
      void logActivity("deleted_banner", "banner", id);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggleActive = async (b: HeroBanner) => {
    try {
      await updateBanner(b.id, { active: !b.active });
      void logActivity("updated_banner", "banner", b.id, { active: !b.active });
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = banners.map((b) => b.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setDragId(null);
    const reordered = ids.map((id) => banners.find((b) => b.id === id)!);
    setBanners(reordered);
    try {
      await reorderBanners(ids);
    } catch (e) {
      toast.error((e as Error).message);
      load();
    }
  };

  const saveInterval = async () => {
    try {
      await saveBannerInterval(interval);
      toast.success("Interval saved");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const copyEmbed = async (b: HeroBanner) => {
    await navigator.clipboard.writeText(generateEmbedCode(b));
    toast.success("Code copied!");
  };

  if (editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader
          title={editing === "new" ? "New banner" : "Edit banner"}
          subtitle="Heading, button, and gradient. Image is optional."
        />
        <BannerForm
          initial={editing === "new" ? undefined : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pb-24 md:pb-0">
      <PageHeader
        title="Hero banners"
        subtitle="Slides that auto-rotate at the top of the home page."
        action={
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add slide
          </button>
        }
        fab={
          <button onClick={() => setEditing("new")} className="admin-fab">
            <Plus className="h-5 w-5" /> Add
          </button>
        }
      />

      <div className="admin-card flex flex-wrap items-end gap-3 p-4">
        <label className="block">
          <div className="mb-1 text-xs font-semibold text-muted-foreground">Auto-rotate interval (seconds)</div>
          <input
            type="number"
            min={2}
            max={60}
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="input w-32"
          />
        </label>
        <button onClick={saveInterval} className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold hover:bg-accent">
          Save interval
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-20 w-full" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <EmptyState
          icon={Images}
          title="No banners yet"
          description="Add a slide to start showing rotating banners on your home page."
          action={
            <button onClick={() => setEditing("new")} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> Add slide
            </button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="order-1 min-w-0 space-y-3 lg:order-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Live preview (first slide)
            </div>
            <div className="lg:sticky lg:top-4">
              {banners[0] && <BannerPreview banner={banners[0]} />}
              <button
                onClick={() => banners[0] && copyEmbed(banners[0])}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-semibold hover:bg-secondary"
              >
                <Copy className="h-4 w-4" /> Copy embed code
              </button>
            </div>
          </div>

          <div className="order-2 min-w-0 space-y-2 lg:order-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Slides ({banners.length})
            </div>
            {banners.map((b) => (
              <div
                key={b.id}
                draggable
                onDragStart={() => onDragStart(b.id)}
                onDragOver={onDragOver}
                onDrop={() => onDrop(b.id)}
                className={`flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card p-2.5 transition ${
                  dragId === b.id ? "opacity-50" : ""
                }`}
              >
                <GripVertical className="h-4 w-4 flex-shrink-0 cursor-grab text-muted-foreground" />
                <div
                  className="h-10 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-12 sm:w-20"
                  style={
                    b.image_url && b.image_only
                      ? {
                          backgroundImage: `url(${b.image_url})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : {
                          background: b.image_url
                            ? `linear-gradient(135deg, ${b.gradient_from}cc, ${b.gradient_to}cc), url(${b.image_url}) center/cover`
                            : `linear-gradient(135deg, ${b.gradient_from}, ${b.gradient_to})`,
                        }
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{b.heading || "(no heading)"}</div>
                  <div className="truncate text-xs text-muted-foreground">{b.subheading}</div>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => toggleActive(b)}
                    title={b.active ? "Active" : "Inactive"}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"
                  >
                    {b.active ? <Eye className="h-4 w-4 text-brand" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
                  </button>
                  <button onClick={() => copyEmbed(b)} title="Copy embed code" className="hidden h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary sm:flex">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditing(b)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
