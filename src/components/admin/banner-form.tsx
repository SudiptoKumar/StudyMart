import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { HeroBanner, HeroBannerInput } from "@/lib/banners";
import { ImageUpload } from "@/components/admin/image-upload";
import { BannerPreview } from "@/components/admin/banner-preview";
import { ColorWheel } from "@/components/admin/color-wheel";

type Props = {
  initial?: HeroBanner;
  onSave: (data: HeroBannerInput) => Promise<void>;
  onCancel: () => void;
};

export function BannerForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState<HeroBannerInput>({
    heading: initial?.heading ?? "",
    subheading: initial?.subheading ?? "",
    button_label: initial?.button_label ?? "Shop now",
    button_link: initial?.button_link ?? "/shop",
    gradient_from: initial?.gradient_from ?? "#6366f1",
    gradient_to: initial?.gradient_to ?? "#a855f7",
    image_url: initial?.image_url ?? null,
    position: initial?.position ?? 0,
    active: initial?.active ?? true,
    image_only: initial?.image_only ?? false,
    show_button: initial?.show_button ?? true,
    text_color: initial?.text_color ?? "#ffffff",
    background_color: initial?.background_color ?? null,
  });
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof HeroBannerInput>(k: K, v: HeroBannerInput[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!form.image_only && !form.heading.trim()) {
      toast.error("Heading is required");
      return;
    }
    if (form.image_only && !form.image_url) {
      toast.error("Upload an image to use image-only mode");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Live preview</div>
        <BannerPreview banner={form} />
      </div>

      <div className="space-y-4">
        <Field label="Poster image (optional, 16:9, max 2MB)">
          <ImageUpload
            value={form.image_url}
            onChange={(url) => {
              update("image_url", url);
              if (!url) update("image_only", false);
            }}
            aspect={16 / 9}
            maxSizeMB={2}
          />
        </Field>

        {form.image_url && (
          <div className="space-y-3 rounded-xl border border-border bg-secondary/40 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.image_only}
                onChange={(e) => update("image_only", e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <div>
                <div className="text-sm font-semibold">Image-only mode</div>
                <div className="text-xs text-muted-foreground">
                  Show just the photo — no heading, subheading, or color overlay.
                </div>
              </div>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.show_button}
                onChange={(e) => update("show_button", e.target.checked)}
                className="mt-0.5 h-4 w-4"
              />
              <div>
                <div className="text-sm font-semibold">Show button</div>
                <div className="text-xs text-muted-foreground">
                  Turn off if your image already includes a call to action.
                </div>
              </div>
            </label>
          </div>
        )}

        <div className={form.image_only ? "pointer-events-none space-y-4 opacity-50" : "space-y-4"}>
          <Field label="Heading">
            <input
              className="input"
              value={form.heading}
              onChange={(e) => update("heading", e.target.value)}
            />
          </Field>
          <Field label="Subheading">
            <input
              className="input"
              value={form.subheading}
              onChange={(e) => update("subheading", e.target.value)}
            />
          </Field>
          <div className="space-y-3 rounded-xl border border-border bg-secondary/30 p-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={!!form.background_color}
                onChange={(e) =>
                  update("background_color", e.target.checked ? form.gradient_from : null)
                }
                className="mt-0.5 h-4 w-4"
              />
              <div>
                <div className="text-sm font-semibold">Use solid background color</div>
                <div className="text-xs text-muted-foreground">
                  Overrides the gradient with a single flat color.
                </div>
              </div>
            </label>

            {form.background_color ? (
              <Field label="Background color">
                <ColorWheel
                  value={form.background_color}
                  onChange={(v) => update("background_color", v)}
                />
              </Field>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Gradient start">
                  <ColorWheel
                    value={form.gradient_from}
                    onChange={(v) => update("gradient_from", v)}
                  />
                </Field>
                <Field label="Gradient end">
                  <ColorWheel
                    value={form.gradient_to}
                    onChange={(v) => update("gradient_to", v)}
                  />
                </Field>
              </div>
            )}

            <Field label="Text color">
              <ColorWheel value={form.text_color} onChange={(v) => update("text_color", v)} />
            </Field>
          </div>
        </div>

        <Field label="Click-through link (optional)">
          <input
            className="input"
            value={form.button_link}
            onChange={(e) => update("button_link", e.target.value)}
            placeholder="/shop or https://..."
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            If set, the entire banner is clickable — even when the button is hidden.
          </p>
        </Field>

        <Field label="Button label">
          <input
            className="input"
            value={form.button_label}
            onChange={(e) => update("button_label", e.target.value)}
          />
        </Field>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update("active", e.target.checked)}
            className="h-4 w-4"
          />
          <span className="text-sm font-medium">Active</span>
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-border py-3 text-sm font-semibold"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
