import { useRef, useState } from "react";
import { Upload, X, Loader2, FileText, Image as ImageIcon, Video } from "lucide-react";
import { toast } from "sonner";
import {
  uploadProductPreview,
  deleteProductPreview,
  previewTypeFromFile,
} from "@/lib/storage";

type PreviewType = "pdf" | "image" | "video";

type Props = {
  value: string | null | undefined;
  type: PreviewType | null | undefined;
  onChange: (next: { path: string | null; type: PreviewType | null }) => void;
};

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.gif,.mp4,.mov,.webm";
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

function iconFor(t: PreviewType | null | undefined) {
  if (t === "image") return ImageIcon;
  if (t === "video") return Video;
  return FileText;
}

export function PreviewUpload({ value, type, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("Preview must be under 10 MB");
      return;
    }
    const t = previewTypeFromFile(f);
    if (!t) {
      toast.error("Unsupported preview format. Use PDF, image, or video.");
      return;
    }
    setUploading(true);
    try {
      // Remove old preview first
      if (value) {
        try {
          await deleteProductPreview(value);
        } catch {
          /* best effort */
        }
      }
      const res = await uploadProductPreview(f);
      onChange({ path: res.path, type: t });
      toast.success("Preview uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (value) {
      try {
        await deleteProductPreview(value);
      } catch {
        /* best effort */
      }
    }
    onChange({ path: null, type: null });
  };

  const Icon = iconFor(type);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-secondary">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                Preview attached
              </div>
              <div className="text-xs text-muted-foreground capitalize">
                {type ?? "file"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex-1 rounded-full border border-border py-2 text-xs font-semibold disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Replace"}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={uploading}
              className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-destructive disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-6 text-muted-foreground transition active:bg-secondary disabled:opacity-50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-soft">
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-foreground">
              {uploading ? "Uploading…" : "Add preview / sample"}
            </div>
            <div className="mt-0.5 text-xs">
              PDF · Image · Video — up to 10 MB
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
