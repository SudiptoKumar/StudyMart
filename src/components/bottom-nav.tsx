import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, Library, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";

type Item = { to: "/" | "/shop" | "/cart" | "/library" | "/account"; label: string; icon: typeof Home; exact?: boolean };
const items: Item[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/shop", label: "Browse", icon: Search },
  { to: "/cart", label: "Cart", icon: ShoppingBag },
  { to: "/library", label: "Library", icon: Library },
  { to: "/account", label: "Account", icon: User },
];

export function BottomNav() {
  const { count } = useCart();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [bounce, setBounce] = useState(false);
  const prevCount = useRef(count);

  useEffect(() => {
    if (count > prevCount.current) {
      setBounce(true);
      const t = setTimeout(() => setBounce(false), 600);
      prevCount.current = count;
      return () => clearTimeout(t);
    }
    prevCount.current = count;
  }, [count]);

  return (
    <nav
      className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[calc(28rem-1.5rem)] -translate-x-1/2 rounded-2xl border border-white/30 bg-background/50 shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-background/40"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
          const isCart = to === "/cart";
          return (
            <Link
              key={to}
              to={to}
              className="relative flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[10px] font-medium transition-colors"
            >
              <div className={`relative ${isCart && bounce ? "animate-bounce" : ""}`}>
                <Icon
                  className={`h-[22px] w-[22px] transition-colors ${
                    active ? "text-brand" : "text-muted-foreground"
                  }`}
                  strokeWidth={active ? 2.4 : 2}
                />
                {isCart && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 font-mono text-[9px] font-bold text-primary-foreground animate-in zoom-in-50 duration-200">
                    {count}
                  </span>
                )}
              </div>
              <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
