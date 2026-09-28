import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProductForm, ProductFormValues } from "@/components/admin/product-form";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products/$id/edit")({
  component: EditProduct,
});

function EditProduct() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<ProductFormValues | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (error || !data) {
        toast.error("Product not found");
        navigate({ to: "/admin/products" });
        return;
      }
      setInitial({
        id: data.id,
        slug: data.slug,
        title: data.title,
        tagline: data.tagline ?? "",
        description: data.description ?? "",
        category: data.category,
        price: Number(data.price ?? 0),
        original_price: data.original_price ? Number(data.original_price) : null,
        status: (data.status === "published" ? "published" : "draft") as "draft" | "published",
        featured: !!data.featured,
        delivery_type: (data.delivery_type === "stream" ? "stream" : "download") as "download" | "stream",
        format: data.format ?? "",
        image_url: data.image_url,
        file_url: data.file_url,
        file_name: data.file_url ? data.file_url.split("/").pop() ?? null : null,
        file_size: null,
        preview_url: (data as { preview_url?: string | null }).preview_url ?? null,
        preview_type: (() => {
          const pt = (data as { preview_type?: string | null }).preview_type;
          return pt === "pdf" || pt === "image" || pt === "video" ? pt : null;
        })(),
      });
    })();
  }, [id, navigate]);

  if (!initial) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <ProductForm initial={initial} />;
}
