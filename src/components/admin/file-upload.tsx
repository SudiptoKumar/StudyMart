import { useRef, useState } from "react";
import { FileText, Upload, X, Loader2, FileArchive, FileSpreadsheet, FileType, FileCode, Music, Video } from "lucide-react";
import { toast } from "sonner";
import {
  uploadProductFile,
  deleteProductFile,
  formatFromFilename,
  humanFileSize,
} from "@/lib/storage";

type Props = {
  /** Current storage path (or null) */
  value: string | null | undefined;
  /** Display label of the file (filename) */
  label?: string | null;
  sizeBytes?: number | null;
  onChange: (next: { path: string | null; name: string | null; size: number | null; format: string | null }) => void;
};

const ACCEPT = [
  ".pdf",
  ".txt",
  ".md",
  ".docx",
  ".doc",
  ".xlsx",
  ".xls",
  ".pptx",
  ".ppt",
  ".zip",
  ".rar",
  ".html",
  ".htm",
  ".epub",
  ".mp3",
  ".wav",
  ".m4a",
  ".mp4",
  ".mov",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".json",
  ".csv",
].join(",");

function iconFor(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["zip", "rar"].includes(ext)) return FileArchive;
  if (["xlsx", "xls", "csv"].includes(ext)) return FileSpreadsheet;
  if (["html", "htm", "json", "md"].includes(ext)) return FileCode;
  if (["mp3", "wav", "m4a"].includes(ext)) return Music;
  if (["mp4", "mov"].includes(ext)) return Video;
  if (["pdf", "docx", "doc", "pptx", "ppt", "txt", "epub"].includes(ext)) return FileType;
  return FileText;
}

export function FileUpload({ value, label, sizeBytes, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onFile = async (f: File | undefined | null) => {
    if (!f) return;
    if (f.size > 200 * 1024 * 1024) {
      toast.error("File must be under 200 MB");
      return;
    }
    setUploading(true);
    setProgress(5);
    try {
      // Best-effort progress ticking while upload runs
      const tick = setInterval(() => setProgress((p) => Math.min(p + 7, 90)), 250);
      const res = await uploadProductFile(f, setProgress);
      clearInterval(tick);
      setProgress(100);
      onChange({
        path: res.path,
        name: res.name,
        size: res.size,
        format: formatFromFilename(res.name),
      });
      toast.success("File uploaded");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 400);
    }
  };

  const remove = async () => {
    if (value) {
      try {
        await deleteProductFile(value);
      } catch {
        // best effort
      }
    }
    onChange({ path: null, name: null, size: null, format: null });
  };

  const Icon = iconFor(label || value || "");

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
              <div className="truncate text-sm font-semibold">{label || value}</div>
              <div className="text-xs text-muted-foreground">
                {sizeBytes ? humanFileSize(sizeBytes) : "Uploaded"}
              </div>
            </div>
          </div>
          {uploading && (
            <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 rounded-full border border-border py-2 text-xs font-semibold"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={remove}
              className="rounded-full border border-border px-3 py-2 text-xs font-semibold text-destructive"
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
              {uploading ? "Uploading…" : "Add digital file"}
            </div>
            <div className="mt-0.5 text-xs">
              PDF · DOCX · XLSX · ZIP · MP3 · MP4 · TXT · MD · HTML — up to 200 MB
            </div>
          </div>
          {uploading && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
        </button>
      )}
    </div>
  );
}
