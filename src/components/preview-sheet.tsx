import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { createPreviewSignedUrl } from "@/lib/storage";

type PreviewType = "pdf" | "image" | "video";

export function PreviewButton({
  previewUrl,
  previewType,
}: {
  previewUrl: string | null | undefined;
  previewType: PreviewType | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [signed, setSigned] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !previewUrl) return;
    let cancelled = false;
    setLoading(true);
    setSigned(null);
    (async () => {
      try {
        const url = await createPreviewSignedUrl(previewUrl, 60 * 60);
        if (!cancelled) setSigned(url);
      } catch {
        if (!cancelled) setSigned(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, previewUrl]);

  if (!previewUrl || !previewType) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card py-3 text-sm font-semibold transition active:bg-secondary"
      >
        <Eye className="h-4 w-4" />
        See preview
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="h-[90vh] rounded-t-3xl p-0 sm:max-w-md sm:mx-auto"
        >
          <SheetHeader className="border-b border-border px-5 pb-3 pt-4 text-left">
            <SheetTitle className="text-base">Sample preview</SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(90vh-60px)] items-center justify-center overflow-auto bg-secondary/40">
            {loading || !signed ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : previewType === "pdf" ? (
              <iframe
                src={`${signed}#toolbar=0&navpanes=0`}
                title="PDF preview"
                className="h-full w-full bg-background"
              />
            ) : previewType === "image" ? (
              <img
                src={signed}
                alt="Product preview"
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <video
                src={signed}
                controls
                playsInline
                className="max-h-full max-w-full"
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
