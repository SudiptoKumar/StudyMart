import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, PlayCircle, Library as LibraryIcon, Loader2, MousePointerClick, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { downloadProductFile, createProductFileSignedUrl } from "@/lib/storage";
import { toast } from "sonner";

type Item = {
  id: string;
  order_id: string;
  product_slug: string;
  product_title: string;
  product_image: string | null;
  product_format: string | null;
  download_token: string;
  created_at: string;
};

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Library — StudyMart" },
      { name: "description", content: "Your purchased digital products." },
    ],
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", search: { redirect: "/library" } });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("order_items")
        .select("*")
        .is("hidden_at", null)
        .order("created_at", { ascending: false });
      setItems((data as Item[]) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const handleAction = async (item: Item) => {
    const isVideo = item.product_format?.toLowerCase().includes("video");
    setPreparingId(item.id);
    try {
      if (isVideo) {
        // Stream: open signed URL in a new tab for inline playback
        const { data: product } = await supabase
          .from("products")
          .select("file_url")
          .eq("slug", item.product_slug)
          .maybeSingle();
        if (!product?.file_url) throw new Error("No file attached to this product.");
        const url = await createProductFileSignedUrl(product.file_url, 60 * 60);
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        await downloadProductFile(item.product_slug);
      }
    } catch (e) {
      toast.error((e as Error).message || "Could not prepare your file");
    } finally {
      setPreparingId(null);
    }
  };

  if (!user || loading) {
    return (
      <div>
        <AppHeader title="Library" />
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div>
      <AppHeader title="Library" />

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 pt-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <LibraryIcon className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h2 className="mt-6 text-xl font-bold">Nothing here yet</h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Items you buy will appear here for instant access.
          </p>
          <Link to="/shop" className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
            Browse catalogue
          </Link>
        </div>
      ) : (
        <div className="px-5">
          <p className="-mt-1 flex items-center gap-1.5 pb-3 text-xs text-muted-foreground">
            <MousePointerClick className="h-3.5 w-3.5" /> Your purchased items — tap to download.
          </p>
          <div className="space-y-2.5">
            {items.map((item) => {
              const isVideo = item.product_format?.toLowerCase().includes("video");
              const preparing = preparingId === item.id;
              return (
                <div
                  key={item.id}
                  className="group relative flex gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-transparent transition-transform active:scale-[0.98] active:ring-primary/30"
                >
                  <div className="relative h-[5.5rem] w-[5.5rem] flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {item.product_image && (
                      <img
                        src={item.product_image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                    <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} /> Owned
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col justify-between min-w-0">
                    <div>
                      <h3 className="truncate text-sm font-semibold leading-tight">
                        {item.product_title}
                      </h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.product_format}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                        Purchased {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAction(item)}
                        disabled={preparing}
                        className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-70"
                      >
                        {preparing ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing…
                          </>
                        ) : isVideo ? (
                          <>
                            <PlayCircle className="h-3.5 w-3.5" /> Watch
                          </>
                        ) : (
                          <>
                            <Download className="h-3.5 w-3.5" /> Download
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
