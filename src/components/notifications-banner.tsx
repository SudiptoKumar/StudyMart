import { Link } from "@tanstack/react-router";
import { BellRing, X, TrendingDown } from "lucide-react";
import { useNotifications } from "@/lib/notifications";
import { formatPrice } from "@/lib/format";

export function NotificationsBanner() {
  const { items, unreadCount, markAllRead } = useNotifications();
  if (unreadCount === 0) return null;

  const unread = items.filter((n) => !n.read_at).slice(0, 3);

  return (
    <section className="px-5 pt-4">
      <div className="rounded-2xl border border-brand/20 bg-brand-soft p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-brand">
            <BellRing className="h-4 w-4" />
            {unreadCount} price drop{unreadCount > 1 ? "s" : ""}
          </div>
          <button
            onClick={markAllRead}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/60"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-2 space-y-1.5">
          {unread.map((n) => {
            const slug = n.payload.product_slug;
            const oldP = n.payload.old_price ?? 0;
            const newP = n.payload.new_price ?? 0;
            return (
              <Link
                key={n.id}
                to="/product/$slug"
                params={{ slug: slug ?? "" }}
                disabled={!slug}
                className="flex items-center gap-2 rounded-xl bg-background/60 p-2 text-xs"
              >
                <TrendingDown className="h-3.5 w-3.5 text-brand" />
                <span className="line-clamp-1 flex-1 font-semibold">{n.payload.product_title}</span>
                <span className="font-mono text-muted-foreground line-through">{formatPrice(oldP)}</span>
                <span className="font-mono font-bold text-brand">{formatPrice(newP)}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
