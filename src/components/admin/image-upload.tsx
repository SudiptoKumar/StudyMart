import { useCallback, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Upload, X, RotateCcw, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadProductImage } from "@/lib/storage";

type Props = {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  aspect?: number;
  maxSizeMB?: number;
};

export function ImageUpload({ value, onChange, aspect = 4 / 3, maxSizeMB = 5 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawSrc, setRawSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image must be under ${maxSizeMB} MB`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawSrc(reader.result as string);
      setOriginalFile(f);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(f);
  };

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx);
  }, []);

  const exportCropped = async (): Promise<Blob> => {
    if (!rawSrc || !croppedAreaPixels) throw new Error("No crop");
    const img = new Image();
    img.src = rawSrc;
    await new Promise((r) => (img.onload = r));
    const canvas = document.createElement("canvas");
    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");
    ctx.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.9);
    });
  };

  const finishUpload = async (blob: Blob, name: string) => {
    setUploading(true);
    try {
      const { publicUrl } = await uploadProductImage(blob, name);
      onChange(publicUrl);
      toast.success("Image uploaded");
      setRawSrc(null);
      setOriginalFile(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const useCropped = async () => {
    try {
      const blob = await exportCropped();
      await finishUpload(blob, originalFile?.name ?? "cover.jpg");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const skipCrop = async () => {
    if (!originalFile) return;
    await finishUpload(originalFile, originalFile.name);
  };

  if (rawSrc) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-foreground/95">
        <div className="flex items-center justify-between p-4 text-background">
          <button
            onClick={() => {
              setRawSrc(null);
              setOriginalFile(null);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/10"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="text-sm font-semibold">Adjust photo</div>
          <button
            onClick={() => {
              setCrop({ x: 0, y: 0 });
              setZoom(1);
            }}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-background/10"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex-1">
          <Cropper
            image={rawSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-3 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex gap-2">
            <button
              disabled={uploading}
              onClick={skipCrop}
              className="flex-1 rounded-full border border-background/30 py-3 text-sm font-semibold text-background disabled:opacity-50"
            >
              Skip crop
            </button>
            <button
              disabled={uploading}
              onClick={useCropped}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
              Use photo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {value ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-2xl bg-secondary" style={{ aspectRatio: aspect }}>
            <img src={value} alt="Cover" className="h-full w-full object-cover" />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-foreground/40">
                <Loader2 className="h-8 w-8 animate-spin text-background" />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex-1 rounded-full border border-border py-2 text-sm font-semibold"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-destructive"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-6 text-muted-foreground transition active:bg-secondary"
          style={{ aspectRatio: aspect }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-soft">
            <ImageIcon className="h-5 w-5" />
          </div>
          <div className="text-center">
            <div className="text-sm font-semibold text-foreground">Add cover photo</div>
            <div className="mt-0.5 text-xs">Tap to choose · JPG, PNG, WEBP · max {maxSizeMB} MB</div>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <Upload className="h-3.5 w-3.5" /> Upload
          </div>
        </button>
      )}
    </div>
  );
}
