import { supabase } from "@/integrations/supabase/client";

export const PRODUCT_IMAGES_BUCKET = "product-images";
export const PRODUCT_FILES_BUCKET = "product-files";

function randomId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  );
}

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80);
}

/** Upload a product cover image. Returns the public URL. */
export async function uploadProductImage(file: Blob, originalName = "image.jpg") {
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${randomId()}.${ext}`;
  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || `image/${ext}`,
    });
  if (error) throw error;
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

/** Upload a sellable digital file. Returns the storage path. */
export async function uploadProductFile(
  file: File,
  onProgress?: (pct: number) => void,
) {
  const safe = sanitizeFileName(file.name);
  const path = `${randomId()}-${safe}`;

  // The supabase-js SDK does not expose progress for storage uploads,
  // so emit synthetic progress around the await.
  onProgress?.(5);
  const { error } = await supabase.storage
    .from(PRODUCT_FILES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw error;
  onProgress?.(100);
  return { path, name: file.name, size: file.size };
}

/** Upload a public preview file (sample). Stored under previews/ in product-files. */
export async function uploadProductPreview(file: File) {
  const safe = sanitizeFileName(file.name);
  const path = `previews/${randomId()}-${safe}`;
  const { error } = await supabase.storage
    .from(PRODUCT_FILES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
  if (error) throw error;
  return { path, name: file.name, size: file.size };
}

/** Detect a preview type from a File or filename. */
export function previewTypeFromFile(file: File | string): "pdf" | "image" | "video" | null {
  const name = typeof file === "string" ? file : file.name;
  const mime = typeof file === "string" ? "" : file.type || "";
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (mime.startsWith("video/") || ["mp4", "mov", "webm", "m4v"].includes(ext)) return "video";
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  return null;
}

/** Create a signed URL for a preview file (1 hour). */
export async function createPreviewSignedUrl(path: string, expiresIn = 60 * 60) {
  const { data, error } = await supabase.storage
    .from(PRODUCT_FILES_BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

/** Delete a preview file. */
export async function deleteProductPreview(path: string) {
  await supabase.storage.from(PRODUCT_FILES_BUCKET).remove([path]);
}

/** Create a short-lived signed URL for a private product file. */
export async function createProductFileSignedUrl(
  path: string,
  expiresIn = 60 * 60,
  downloadName?: string,
) {
  const { data, error } = await supabase.storage
    .from(PRODUCT_FILES_BUCKET)
    .createSignedUrl(path, expiresIn, downloadName ? { download: downloadName } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

/** Recover the original filename from a stored path like `<randomId>-<safeName>`. */
export function originalNameFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const dashIdx = base.indexOf("-");
  if (dashIdx === -1) return base;
  return base.slice(dashIdx + 1) || base;
}

/**
 * Download the digital file for a product slug as a real file save
 * (forces Content-Disposition: attachment with the original filename).
 */
export async function downloadProductFile(slug: string): Promise<void> {
  const { data: product, error } = await supabase
    .from("products")
    .select("file_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!product?.file_url) throw new Error("No file attached to this product.");

  const filename = originalNameFromPath(product.file_url);
  const signedUrl = await createProductFileSignedUrl(product.file_url, 60 * 60, filename);

  const a = document.createElement("a");
  a.href = signedUrl;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/** Delete a product image by storage path or public URL. */
export async function deleteProductImage(pathOrUrl: string) {
  const path = pathOrUrl.includes("/product-images/")
    ? pathOrUrl.split("/product-images/")[1]
    : pathOrUrl;
  await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
}

/** Delete a product file by storage path. */
export async function deleteProductFile(path: string) {
  await supabase.storage.from(PRODUCT_FILES_BUCKET).remove([path]);
}

/** Infer a friendly format label from a filename. */
export function formatFromFilename(name: string): string {
  const ext = name.split(".").pop()?.toUpperCase() || "";
  const map: Record<string, string> = {
    JPG: "Image",
    JPEG: "Image",
    PNG: "Image",
    GIF: "Image",
    WEBP: "Image",
    MP3: "Audio",
    MP4: "Video",
    MOV: "Video",
    DOCX: "DOCX",
    XLSX: "XLSX",
    XLS: "XLS",
    PPTX: "PPTX",
    PDF: "PDF",
    EPUB: "ePub",
    TXT: "Text",
    MD: "Markdown",
    HTML: "HTML",
    JSON: "JSON",
    CSV: "CSV",
    ZIP: "ZIP",
  };
  return map[ext] || ext || "File";
}

export function humanFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}
