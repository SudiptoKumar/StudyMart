import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Ticket,
  Megaphone,
  ScrollText,
  Bell,
  Images,
  LogOut,
  Menu,
  X,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { AdminSearch } from "@/components/admin/admin-search";
import { RecentActivityPopover } from "@/components/admin/recent-activity-popover";

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
  badgeKey?: "orders" | "notifications";
};
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/bundles", label: "Bundles", icon: Package },
  { to: "/admin/banners", label: "Banners", icon: Images },
  { to: "/admin/orders", label: "Orders", icon: ShoppingCart, badgeKey: "orders" },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/coupons", label: "Coupons", icon: Ticket },
  { to: "/admin/promos", label: "Promotions", icon: Megaphone },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" },
  { to: "/admin/logs", label: "Activity", icon: ScrollText },
];

const LABEL_FROM_PATH: Record<string, string> = Object.fromEntries(
  NAV.map((n) => [n.to, n.label]),
);

function buildBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0 || parts[0] !== "admin") return [{ label: "Admin", to: "/admin" }];
  const crumbs: { label: string; to: string }[] = [{ label: "Admin", to: "/admin" }];
  let acc = "/admin";
  for (let i = 1; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const known = LABEL_FROM_PATH[acc];
    if (known) {
      crumbs.push({ label: known, to: acc });
    } else {
      const seg = parts[i];
      const label =
        seg === "new" ? "New" : seg === "edit" ? "Edit" : seg.length > 12 ? `${seg.slice(0, 6)}…` : seg;
      crumbs.push({ label: label[0].toUpperCase() + label.slice(1), to: acc });
    }
  }
  return crumbs;
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("admin:sidebar:collapsed") === "1";
  });
  const [badges, setBadges] = useState<{ orders: number; notifications: number }>({
    orders: 0,
    notifications: 0,
  });
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin:sidebar:collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fetch badge counts + revalidate every 60s
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [pendingOrders, pendingNotifs] = await Promise.all([
        supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed")
          .eq("delivery_status", "pending"),
        supabase
          .from("notification_queue")
          .select("id", { count: "exact", head: true })
          .is("sent_at", null),
      ]);
      if (cancelled) return;
      setBadges({
        orders: pendingOrders.count ?? 0,
        notifications: pendingNotifs.count ?? 0,
      });
    };
    load();
    const interval = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const crumbs = buildBreadcrumbs(pathname);
  const initial = (user?.email ?? "?")[0].toUpperCase();

  const SidebarNav = ({ compact }: { compact: boolean }) => (
    <nav className="flex flex-col gap-1 px-2 py-3">
      {NAV.map(({ to, label, icon: Icon, exact, badgeKey }) => {
        const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
        const badgeValue = badgeKey ? badges[badgeKey] : 0;
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            title={compact ? label : undefined}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
              active
                ? "bg-brand text-primary-foreground shadow-soft"
                : "text-foreground/80 hover:bg-secondary hover:text-foreground"
            } ${compact ? "justify-center px-2" : ""}`}
          >
            <Icon
              className={`h-[18px] w-[18px] flex-shrink-0 ${active ? "" : "text-muted-foreground group-hover:text-foreground"}`}
              strokeWidth={active ? 2.4 : 2}
            />
            {!compact && <span className="truncate">{label}</span>}
            {!compact && badgeValue > 0 && (
              <span
                className={`ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : badgeKey === "orders"
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-secondary text-foreground"
                }`}
              >
                {badgeValue > 99 ? "99+" : badgeValue}
              </span>
            )}
            {active && !compact && badgeValue === 0 && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary-foreground/80" />
            )}
            {compact && badgeValue > 0 && (
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/90 px-3 backdrop-blur md:h-16 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {/* Mobile menu */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary md:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {/* Desktop collapse */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary md:flex"
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4.5 w-4.5" />
            ) : (
              <PanelLeftClose className="h-4.5 w-4.5" />
            )}
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <span className="font-semibold">Admin</span>
          </Link>

          {/* Breadcrumbs (md+) */}
          <nav className="ml-3 hidden min-w-0 items-center gap-1 text-sm text-muted-foreground md:flex">
            {crumbs.map((c, i) => (
              <span key={c.to} className="flex min-w-0 items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />}
                {i === crumbs.length - 1 ? (
                  <span className="truncate font-semibold text-foreground">{c.label}</span>
                ) : (
                  <Link to={c.to} className="truncate hover:text-foreground">
                    {c.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <AdminSearch />
          <RecentActivityPopover />
          <div className="hidden items-center gap-2 rounded-full border border-border bg-background py-0.5 pl-1 pr-2 sm:inline-flex">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-primary-foreground">
              {initial}
            </div>
            <span className="max-w-[140px] truncate text-xs text-muted-foreground">
              {user?.email}
            </span>
          </div>
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
            aria-label="View site"
            title="View site"
          >
            <Home className="h-4 w-4" />
          </Link>
          <button
            onClick={() => signOut()}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Mobile drawer + backdrop */}
        {mobileOpen && (
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 top-14 z-30 bg-foreground/40 backdrop-blur-sm md:hidden"
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 top-14 z-30 w-64 border-r border-border bg-background transition-transform duration-200 md:hidden ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <SidebarNav compact={false} />
        </aside>

        {/* Desktop sidebar */}
        <aside
          className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 border-r border-border bg-background transition-[width] duration-200 md:block md:top-16 md:h-[calc(100vh-4rem)] ${
            collapsed ? "w-[68px]" : "w-60"
          }`}
        >
          <SidebarNav compact={collapsed} />
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
