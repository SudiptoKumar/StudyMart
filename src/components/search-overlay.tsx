import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, X, Clock, TrendingUp, SearchX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapDbProduct, type Product, categories } from "@/lib/products";
import { formatPrice } from "@/lib/format";

const RECENTS_KEY = "sm_recent_searches";
const MAX_RECENTS = 6;

function readRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return;
  const cur = readRecents().filter((r) => r.toLowerCase() !== trimmed.toLowerCase());
  cur.unshift(trimmed);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(cur.slice(0, MAX_RECENTS)));
}

type DbRow = Parameters<typeof mapDbProduct>[0];

export function SearchOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [recents, setRecents] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setRecents(readRecents());
      // small delay to let the overlay mount before focusing
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQ("");
      setResults([]);
    }
  }, [open]);

  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Debounced search
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const safe = term.replace(/[%,()]/g, " ").trim();
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .or(`title.ilike.%${safe}%,tagline.ilike.%${safe}%,category.ilike.%${safe}%`)
        .limit(8);
      setResults((data ?? []).map((p) => mapDbProduct(p as DbRow)));
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  const popularCats = useMemo(() => categories.slice(1, 6), []);

  const submitSearch = (term: string) => {
    pushRecent(term);
    onClose();
    navigate({ to: "/shop", search: { q: term } });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      <div className="mx-auto flex h-full max-w-md flex-col">
        {/* Search bar */}
        <div className="flex items-center gap-2 border-b border-border px-4 pb-3 pt-4">
          <button
            onClick={onClose}
            aria-label="Close search"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-secondary"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
          <div className="flex h-12 flex-1 items-center gap-2 rounded-2xl bg-secondary px-3">
            <Search className="h-[18px] w-[18px] text-muted-foreground" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && q.trim()) submitSearch(q.trim());
              }}
              placeholder="Search notes, PDFs, courses…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {q && (
              <button onClick={() => setQ("")} aria-label="Clear" className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          {/* Idle state */}
          {!q.trim() && (
            <div className="px-5 pt-4">
              {recents.length > 0 && (
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent
                    </h3>
                    <button
                      onClick={() => {
                        localStorage.removeItem(RECENTS_KEY);
                        setRecents([]);
                      }}
                      className="text-xs font-semibold text-muted-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-2 flex flex-col">
                    {recents.map((r) => (
                      <button
                        key={r}
                        onClick={() => submitSearch(r)}
                        className="flex items-center gap-3 py-2.5 text-left text-sm"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{r}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" /> Popular categories
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {popularCats.map((c) => (
                    <Link
                      key={c}
                      to="/shop"
                      search={{ cat: c }}
                      onClick={onClose}
                      className="rounded-full bg-secondary px-4 py-2 text-xs font-semibold"
                    >
                      {c}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          {q.trim() && (
            <div className="px-5 pt-3">
              {loading && (
                <p className="py-6 text-center text-xs text-muted-foreground">Searching…</p>
              )}
              {!loading && results.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
                    <SearchX className="h-6 w-6 animate-pulse" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No matches for “{q}”.
                  </p>
                </div>
              )}
              {!loading && results.length > 0 && (
                <div className="flex flex-col">
                  {results.map((p) => (
                    <Link
                      key={p.slug}
                      to="/product/$slug"
                      params={{ slug: p.slug }}
                      onClick={() => {
                        pushRecent(q.trim());
                        onClose();
                      }}
                      className="flex items-center gap-3 rounded-2xl py-2 active:bg-secondary"
                    >
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-secondary">
                        <img src={p.image} alt={p.title} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.title}</p>
                        <p className="text-[11px] text-muted-foreground">{p.category}</p>
                      </div>
                      <span className="font-mono text-sm font-bold">{formatPrice(p.price)}</span>
                    </Link>
                  ))}
                  <button
                    onClick={() => submitSearch(q.trim())}
                    className="mt-3 rounded-full bg-secondary px-4 py-3 text-center text-xs font-semibold"
                  >
                    See all results in shop →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
