import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "danger" | "info" | "neutral" | "brand";

const TONE_CLASS: Record<Tone, string> = {
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  neutral: "bg-secondary text-muted-foreground",
  brand: "bg-brand-soft text-brand",
};

export function StatusPill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (["completed", "delivered", "active", "live", "published", "paid"].includes(s)) return "success";
  if (["pending", "processing", "draft"].includes(s)) return "warning";
  if (["failed", "cancelled", "canceled", "refunded", "inactive", "hidden"].includes(s)) return "danger";
  return "neutral";
}
