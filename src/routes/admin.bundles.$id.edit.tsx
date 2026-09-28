import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { BundleForm, type BundleFormValues } from "@/components/admin/bundle-form";

export const Route = createFileRoute("/admin/bundles/$id/edit")({
  component: EditBundle,
});

function EditBundle() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [initial, setInitial] = useState<BundleFormValues | null>(null);

  useEffect(() => {
    (async () => {
      const { data: b, error } = await supabase.from("bundles").select("*").eq("id", id).maybeSingle();
      if (error || !b) {
        toast.error("Bundle not found");
        navigate({ to: "/admin/bundles" });
        return;
      }
      const { data: items } = await supabase
        .from("bundle_items")
        .select("product_slug, position")
        .eq("bundle_id", id)
        .order("position", { ascending: true });
      setInitial({
        id: b.id,
        slug: b.slug,
        title: b.title,
        description: b.description ?? "",
        image_url: b.image_url,
        price: Number(b.price),
        original_price: b.original_price !== null ? Number(b.original_price) : null,
        status: b.status === "published" ? "published" : "draft",
        featured: b.featured,
        item_slugs: (items ?? []).map((r) => r.product_slug),
      });
    })();
  }, [id, navigate]);

  if (!initial) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  return <BundleForm initial={initial} />;
}
