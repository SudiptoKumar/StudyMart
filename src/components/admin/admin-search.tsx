import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Package, ShoppingCart, Users, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Result =
  | { kind: "product"; id: string; title: string; slug: string }
  | { kind: "bundle"; id: string; title: string; slug: string }
  | { kind: "order"; id: string; order_number: string; email: string | null }
  | { kind: "customer"; user_id: string; email: string | null; name: string | null };

export function AdminSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const navigate = useNavigate();
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const term = q.trim();
    debounce.current = setTimeout(async () => {
      const like = `%${term}%`;
      const [products, bundles, orders, customers] = await Promise.all([
        supabase
          .from("products")
          .select("id,title,slug")
          .or(`title.ilike.${like},slug.ilike.${like}`)
          .limit(5),
        supabase
          .from("bundles")
          .select("id,title,slug")
          .or(`title.ilike.${like},slug.ilike.${like}`)
          .limit(5),
        supabase
          .from("orders")
          .select("id,order_number,customer_email")
          .or(`order_number.ilike.${like},customer_email.ilike.${like}`)
          .limit(5),
        supabase
          .from("profiles")
          .select("user_id,display_name")
          .ilike("display_name", like)
          .limit(5),
      ]);
      const combined: Result[] = [
        ...(products.data ?? []).map((p) => ({ kind: "product" as const, id: p.id, title: p.title, slug: p.slug })),
        ...(bundles.data ?? []).map((b) => ({ kind: "bundle" as const, id: b.id, title: b.title, slug: b.slug })),
        ...(orders.data ?? []).map((o) => ({
          kind: "order" as const,
          id: o.id,
          order_number: o.order_number,
          email: o.customer_email,
        })),
        ...(customers.data ?? []).map((c) => ({
          kind: "customer" as const,
          user_id: c.user_id,
          email: null,
          name: c.display_name,
        })),
      ];
      setResults(combined);
    }, 200);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q]);

  const grouped = useMemo(() => {
    return {
      products: results.filter((r): r is Extract<Result, { kind: "product" }> => r.kind === "product"),
      bundles: results.filter((r): r is Extract<Result, { kind: "bundle" }> => r.kind === "bundle"),
      orders: results.filter((r): r is Extract<Result, { kind: "order" }> => r.kind === "order"),
      customers: results.filter((r): r is Extract<Result, { kind: "customer" }> => r.kind === "customer"),
    };
  }, [results]);

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary md:px-3"
        aria-label="Search admin"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Search…</span>
        <span className="ml-2 hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:inline">⌘K</span>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search products, bundles, orders, customers…" value={q} onValueChange={setQ} />
        <CommandList>
          {q && results.length === 0 && <CommandEmpty>No results.</CommandEmpty>}
          {grouped.products.length > 0 && (
            <CommandGroup heading="Products">
              {grouped.products.map((r) => (
                <CommandItem
                  key={`p-${r.id}`}
                  onSelect={() => go(`/admin/products/${r.id}/edit`)}
                  value={`product ${r.title} ${r.slug}`}
                >
                  <Package className="mr-2 h-4 w-4" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">/{r.slug}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {grouped.bundles.length > 0 && (
            <CommandGroup heading="Bundles">
              {grouped.bundles.map((r) => (
                <CommandItem
                  key={`b-${r.id}`}
                  onSelect={() => go(`/admin/bundles/${r.id}/edit`)}
                  value={`bundle ${r.title} ${r.slug}`}
                >
                  <Layers className="mr-2 h-4 w-4" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">/{r.slug}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {grouped.orders.length > 0 && (
            <CommandGroup heading="Orders">
              {grouped.orders.map((r) => (
                <CommandItem
                  key={`o-${r.id}`}
                  onSelect={() => go(`/admin/orders`)}
                  value={`order ${r.order_number} ${r.email ?? ""}`}
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <span className="truncate font-mono text-xs">{r.order_number}</span>
                  {r.email && <span className="ml-2 truncate text-xs text-muted-foreground">{r.email}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {grouped.customers.length > 0 && (
            <CommandGroup heading="Customers">
              {grouped.customers.map((r) => (
                <CommandItem
                  key={`c-${r.user_id}`}
                  onSelect={() => go(`/admin/customers`)}
                  value={`customer ${r.name ?? ""}`}
                >
                  <Users className="mr-2 h-4 w-4" />
                  <span className="truncate">{r.name ?? "—"}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
