import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  /** Mobile floating action button (rendered as fixed FAB on small screens) */
  fab?: ReactNode;
};

export function PageHeader({ title, subtitle, action, fab }: Props) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action && <div className="hidden md:block">{action}</div>}
      </div>
      {fab && (
        <div
          style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          className="pointer-events-none fixed right-5 z-40 md:hidden"
        >
          <div className="pointer-events-auto">{fab}</div>
        </div>
      )}
    </>
  );
}
