import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Download, PlayCircle, Library, Loader2, Mail, Hash, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { downloadProductFile, createProductFileSignedUrl } from "@/lib/storage";
import { toast } from "sonner";

type Item = {
  id: string;
  product_slug: string;
  product_title: string;
  product_image: string | null;
  product_format: string | null;
  product_code: string | null;
  download_token: string;
};

type Order = {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method: string | null;
  status: string;
  created_at: string;
};

export const Route = createFileRoute("/order/$id")({
  head: () => ({
    meta: [
      { title: "Order confirmed — StudyMart" },
      { name: "description", content: "Your order is confirmed." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [preparingId, setPreparingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth", search: { redirect: `/order/${id}` } });
  }, [user, authLoading, id, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: o }, { data: it }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id),
      ]);
      setOrder(o as Order | null);
      setItems((it as Item[]) ?? []);
      setLoading(false);
    })();
  }, [id, user]);

  const handleAction = async (item: Item) => {
    const isVideo = item.product_format?.toLowerCase().includes("video");
    setPreparingId(item.id);
    try {
      if (isVideo) {
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

  if (loading || !order) {
    return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div>
      <div className="px-5 pt-10 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 animate-in zoom-in-50 duration-300">
          <CheckCircle2 className="h-12 w-12 text-success" strokeWidth={2} />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Payment successful</h1>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <Mail className="h-3.5 w-3.5" />
          Confirmation sent to <span className="font-semibold text-foreground">{user?.email}</span>
        </p>
        <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-mono text-xs font-bold">
          <Hash className="h-3 w-3" />{order.order_number}
        </p>
      </div>

      <section className="mt-8 px-5">
        <h2 className="text-sm font-bold">Your access</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Files are saved to your device with the original name.
        </p>
        <div className="mt-3 space-y-2.5">
          {items.map((item) => {
            const isVideo = item.product_format?.toLowerCase().includes("video");
            const preparing = preparingId === item.id;
            return (
              <div
                key={item.id}
                className="flex gap-3 rounded-2xl bg-card p-3 shadow-soft ring-1 ring-transparent transition-transform active:scale-[0.98] active:ring-primary/30"
              >
                <div className="relative h-[5.5rem] w-[5.5rem] flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {item.product_image && (
                    <img src={item.product_image} alt="" className="h-full w-full object-cover" />
                  )}
                  <span className="absolute left-1 top-1 inline-flex items-center gap-0.5 rounded-full bg-emerald-500/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} /> Owned
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <h3 className="truncate text-sm font-semibold">{item.product_title}</h3>
                    <p className="text-xs text-muted-foreground">{item.product_format}</p>
                    {item.product_code && (
                      <p className="mt-0.5 font-mono text-[10px] font-bold tracking-wide text-muted-foreground">
                        {item.product_code}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleAction(item)}
                    disabled={preparing}
                    className="inline-flex w-fit items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-70"
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
            );
          })}
        </div>
      </section>

      <div className="mt-8 px-5 pb-12">
        <Link
          to="/library"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-secondary text-sm font-semibold"
        >
          <Library className="h-4 w-4" /> Go to my Library
        </Link>
        <Link
          to="/shop"
          className="mt-2 flex h-12 w-full items-center justify-center text-sm font-semibold text-brand"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
