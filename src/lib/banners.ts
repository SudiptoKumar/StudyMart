import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type HeroBanner = {
  id: string;
  heading: string;
  subheading: string;
  button_label: string;
  button_link: string;
  gradient_from: string;
  gradient_to: string;
  image_url: string | null;
  position: number;
  active: boolean;
  image_only: boolean;
  show_button: boolean;
  text_color: string;
  background_color: string | null;
};

export type HeroBannerInput = Omit<HeroBanner, "id">;

const SETTINGS_KEY = "hero_banner_settings";
const DEFAULT_INTERVAL = 5;

// Accent palettes for auto-generated promo / coupon slides
const PROMO_GRADIENTS: Array<[string, string]> = [
  ["#6366f1", "#a855f7"],
  ["#f97316", "#ef4444"],
  ["#10b981", "#06b6d4"],
  ["#ec4899", "#8b5cf6"],
  ["#0ea5e9", "#6366f1"],
];
const COUPON_GRADIENTS: Array<[string, string]> = [
  ["#f59e0b", "#ef4444"],
  ["#22c55e", "#0ea5e9"],
  ["#a855f7", "#ec4899"],
  ["#14b8a6", "#6366f1"],
];

function hashIndex(seed: string, mod: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

function isPromoLive(p: { starts_at: string | null; ends_at: string | null }, now: number) {
  const start = p.starts_at ? new Date(p.starts_at).getTime() : -Infinity;
  const end = p.ends_at ? new Date(p.ends_at).getTime() : Infinity;
  return now >= start && now <= end;
}

function isCouponLive(c: { expires_at: string | null }, now: number) {
  if (!c.expires_at) return true;
  return new Date(c.expires_at).getTime() > now;
}

type PromoRow = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  position: number;
};

type CouponRow = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  active: boolean;
  expires_at: string | null;
  created_at: string;
};

function promoToBanner(p: PromoRow): HeroBanner {
  const [from, to] = PROMO_GRADIENTS[hashIndex(p.id, PROMO_GRADIENTS.length)];
  return {
    id: `promo-${p.id}`,
    heading: p.title,
    subheading: p.subtitle ?? "",
    button_label: p.cta_label ?? "Learn more",
    button_link: p.cta_url ?? "/shop",
    gradient_from: from,
    gradient_to: to,
    image_url: p.image_url,
    position: p.position ?? 0,
    active: true,
    image_only: false,
    show_button: !!(p.cta_label || p.cta_url),
    text_color: "#ffffff",
    background_color: null,
  };
}

function couponSubline(c: CouponRow): string {
  if (c.description) return c.description;
  const value =
    c.discount_type === "percent"
      ? `${Number(c.discount_value)}% off`
      : `৳${Number(c.discount_value)} off`;
  if (c.expires_at) {
    const d = new Date(c.expires_at);
    const when = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${value} — ends ${when}`;
  }
  return `${value} on your order`;
}

function couponToBanner(c: CouponRow): HeroBanner {
  const [from, to] = COUPON_GRADIENTS[hashIndex(c.id, COUPON_GRADIENTS.length)];
  return {
    id: `coupon-${c.id}`,
    heading: `Save with ${c.code}`,
    subheading: couponSubline(c),
    button_label: "Shop now",
    button_link: `/shop?coupon=${encodeURIComponent(c.code)}`,
    gradient_from: from,
    gradient_to: to,
    image_url: null,
    position: 0,
    active: true,
    image_only: false,
    show_button: true,
    text_color: "#ffffff",
    background_color: null,
  };
}

export function useHeroBanners() {
  const [adminBanners, setAdminBanners] = useState<HeroBanner[]>([]);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [intervalSeconds, setIntervalSeconds] = useState<number>(DEFAULT_INTERVAL);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    const [bannersRes, settingsRes, promosRes, couponsRes] = await Promise.all([
      supabase
        .from("hero_banners")
        .select("*")
        .eq("active", true)
        .order("position", { ascending: true }),
      supabase.from("app_settings").select("value").eq("key", SETTINGS_KEY).maybeSingle(),
      supabase
        .from("promotions")
        .select("id,title,subtitle,cta_label,cta_url,image_url,active,starts_at,ends_at,position")
        .eq("active", true)
        .order("position", { ascending: true }),
      supabase
        .from("coupons")
        .select("id,code,description,discount_type,discount_value,active,expires_at,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false }),
    ]);
    setAdminBanners((bannersRes.data ?? []) as HeroBanner[]);
    const v = (settingsRes.data?.value as { interval_seconds?: number } | null)?.interval_seconds;
    setIntervalSeconds(typeof v === "number" && v > 0 ? v : DEFAULT_INTERVAL);
    setPromos((promosRes.data ?? []) as PromoRow[]);
    setCoupons((couponsRes.data ?? []) as CouponRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    const channel = supabase
      .channel("hero_feed_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "hero_banners" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promotions" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "coupons" },
        () => load(),
      )
      .subscribe();
    // Re-evaluate time filters every 60s so expired items drop out automatically
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(channel);
      clearInterval(id);
    };
  }, [load]);

  const now = Date.now();
  // tick is read so eslint doesn't complain & memo keys refresh
  void tick;
  const livePromos = promos.filter((p) => isPromoLive(p, now)).map(promoToBanner);
  const liveCoupons = coupons.filter((c) => isCouponLive(c, now)).map(couponToBanner);
  const banners: HeroBanner[] = [...adminBanners, ...livePromos, ...liveCoupons];

  return { banners, intervalSeconds, loading, reload: load };
}

export async function fetchAllBanners(): Promise<HeroBanner[]> {
  const { data, error } = await supabase
    .from("hero_banners")
    .select("*")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HeroBanner[];
}

export async function fetchBannerInterval(): Promise<number> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", SETTINGS_KEY)
    .maybeSingle();
  const v = (data?.value as { interval_seconds?: number } | null)?.interval_seconds;
  return typeof v === "number" && v > 0 ? v : DEFAULT_INTERVAL;
}

export async function saveBannerInterval(seconds: number) {
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: SETTINGS_KEY, value: { interval_seconds: seconds } }, { onConflict: "key" });
  if (error) throw error;
}

export async function createBanner(input: Omit<HeroBannerInput, "position"> & { position?: number }) {
  const { data, error } = await supabase.from("hero_banners").insert(input).select().single();
  if (error) throw error;
  return data as HeroBanner;
}

export async function updateBanner(id: string, patch: Partial<HeroBannerInput>) {
  const { error } = await supabase.from("hero_banners").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteBanner(id: string) {
  const { error } = await supabase.from("hero_banners").delete().eq("id", id);
  if (error) throw error;
}

export async function reorderBanners(orderedIds: string[]) {
  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("hero_banners").update({ position: index }).eq("id", id),
    ),
  );
}
