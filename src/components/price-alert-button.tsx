import { useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { usePriceAlert } from "@/lib/price-alerts";
import { useAuth } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatPrice } from "@/lib/format";

export function PriceAlertButton({
  productId,
  currentPrice,
  size = "default",
}: {
  productId: string;
  currentPrice: number;
  size?: "sm" | "default";
}) {
  const isSm = size === "sm";
  const btnSize = isSm ? "h-8 w-8" : "h-12 w-12";
  const iconSize = isSm ? "h-4 w-4" : "h-5 w-5";
  const { user } = useAuth();
  const navigate = useNavigate();
  const { alert, loading, create, remove } = usePriceAlert(productId);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>("");

  const handleClick = () => {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/product/${productId}` } });
      return;
    }
    if (alert) {
      void remove().then(() => toast.success("Alert removed"));
    } else {
      setTarget(Math.max(0, currentPrice - 1).toFixed(2));
      setOpen(true);
    }
  };

  const handleCreate = async () => {
    const t = target.trim() === "" ? null : Number(target);
    if (t !== null && (Number.isNaN(t) || t < 0)) {
      toast.error("Enter a valid target price");
      return;
    }
    try {
      await create(t);
      setOpen(false);
      toast.success(t === null ? "We'll notify you on any price drop" : `We'll notify you when it drops to ${formatPrice(t, { decimals: 2 })}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`flex ${btnSize} items-center justify-center rounded-full border transition active:scale-95 ${
          alert
            ? "border-brand bg-brand-soft text-brand"
            : "border-border bg-background text-foreground"
        }`}
        aria-label={alert ? "Remove price alert" : "Notify on price drop"}
      >
        {loading ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : alert ? (
          <BellRing key="on" className={`${iconSize} animate-in zoom-in-50 duration-300`} />
        ) : (
          <Bell key="off" className={iconSize} />
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Notify me on price drop</DialogTitle>
            <DialogDescription>
              We'll alert you when the price drops below your target. Leave blank for any drop.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-xs font-semibold">Target price (BDT ৳)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="Any drop"
              className="mt-1.5 h-11 w-full rounded-xl border border-border bg-background px-3 font-mono text-sm"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Current price: {formatPrice(currentPrice, { decimals: 2 })}</p>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {loading ? "Saving…" : "Notify me"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
