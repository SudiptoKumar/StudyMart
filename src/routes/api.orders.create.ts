import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import { sendOrderNotification } from "@/lib/notification-server";

const itemSchema = z.object({
  slug: z.string().min(1).max(255),
  qty: z.number().int().min(1).max(99),
});

const clientMetaSchema = z
  .object({
    user_agent: z.string().max(1000).nullable().optional(),
    language: z.string().max(64).nullable().optional(),
    referrer: z.string().max(2000).nullable().optional(),
    screen: z.string().max(32).nullable().optional(),
  })
  .optional()
  .nullable();

const bodySchema = z.object({
  items: z.array(itemSchema).min(1).max(50),
  couponCode: z.string().trim().min(1).max(64).optional().nullable(),
  paymentMethod: z.enum(["card", "apple", "wallet"]),
  clientMeta: clientMetaSchema,
});

async function getAuthenticatedUserId(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (!token) return null;

  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub;
}

async function computeCoupon(code: string, subtotal: number) {
  const normalized = code.trim();
  const { data: coupon } = await supabaseAdmin
    .from("coupons")
    .select("*")
    .ilike("code", normalized)
    .maybeSingle();

  if (!coupon) return { ok: false as const, error: "Invalid coupon code" };
  if (!coupon.active) return { ok: false as const, error: "This coupon is no longer active" };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { ok: false as const, error: "This coupon has expired" };
  }
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { ok: false as const, error: "This coupon has reached its usage limit" };
  }
  if (coupon.min_amount != null && subtotal < Number(coupon.min_amount)) {
    return { ok: false as const, error: `Minimum order of $${coupon.min_amount} required` };
  }

  let discountAmount = 0;
  if (coupon.discount_type === "percent") {
    discountAmount = (subtotal * Number(coupon.discount_value)) / 100;
  } else {
    discountAmount = Number(coupon.discount_value);
  }
  discountAmount = Math.min(discountAmount, subtotal);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    ok: true as const,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
    discountAmount,
    description: coupon.description,
    couponId: coupon.id,
    usedCount: coupon.used_count ?? 0,
  };
}

export const Route = createFileRoute("/api/orders/create")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getAuthenticatedUserId(request);
        if (!userId) {
          return Response.json({ ok: false, error: "Not authenticated" }, { status: 401 });
        }

        let parsed;
        try {
          const body = await request.json();
          parsed = bodySchema.parse(body);
        } catch {
          return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
        }

        // Server-side product lookup — never trust client prices
        const slugs = parsed.items.map((i) => i.slug);
        const { data: products } = await supabaseAdmin
          .from("products")
          .select("slug, title, price, image_url, format, status, product_code")
          .in("slug", slugs);

        if (!products) {
          return Response.json({ ok: false, error: "Could not load products" }, { status: 500 });
        }

        const productMap = new Map(products.map((p) => [p.slug, p]));
        for (const i of parsed.items) {
          const p = productMap.get(i.slug);
          if (!p || p.status !== "published") {
            return Response.json({ ok: false, error: `Product unavailable: ${i.slug}` }, { status: 400 });
          }
        }

        const subtotal = parsed.items.reduce((sum, i) => {
          const p = productMap.get(i.slug)!;
          return sum + Number(p.price) * i.qty;
        }, 0);

        let discountAmount = 0;
        let couponCode: string | null = null;
        let couponId: string | null = null;
        let couponUsedCount = 0;
        if (parsed.couponCode) {
          const c = await computeCoupon(parsed.couponCode, subtotal);
          if (!c.ok) return Response.json({ ok: false, error: c.error }, { status: 400 });
          discountAmount = c.discountAmount;
          couponCode = c.code;
          couponId = c.couponId;
          couponUsedCount = c.usedCount;
        }

        const total = Math.max(0, subtotal - discountAmount);

        const { data: order, error: orderErr } = await supabaseAdmin
          .from("orders")
          .insert({
            user_id: userId,
            total_amount: total,
            payment_method: parsed.paymentMethod,
            status: "completed",
            coupon_code: couponCode,
            discount_amount: discountAmount,
          })
          .select()
          .single();

        if (orderErr || !order) {
          return Response.json({ ok: false, error: "Could not create order" }, { status: 500 });
        }

        const itemRows = parsed.items.map((i) => {
          const p = productMap.get(i.slug)!;
          return {
            order_id: order.id,
            user_id: userId,
            product_slug: p.slug,
            product_title: p.title,
            product_image: p.image_url,
            product_format: p.format,
            product_code: (p as { product_code: string | null }).product_code ?? null,
            unit_price: Number(p.price),
            quantity: i.qty,
          };
        });

        const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(itemRows);
        if (itemsErr) {
          await supabaseAdmin.from("orders").delete().eq("id", order.id);
          return Response.json({ ok: false, error: "Could not record order items" }, { status: 500 });
        }

        await supabaseAdmin.from("cart_items").delete().eq("user_id", userId);

        if (couponId) {
          await supabaseAdmin
            .from("coupons")
            .update({ used_count: couponUsedCount + 1 })
            .eq("id", couponId);
        }

        // Fire-and-forget Telegram notification — never blocks the order response
        await sendOrderNotification(order.id, parsed.clientMeta ?? {}, request);

        // Activity log (best-effort)
        try {
          await supabaseAdmin.from("activity_logs").insert({
            actor_id: userId,
            action: "created_order",
            entity_type: "order",
            entity_id: order.id,
            metadata: { order_number: order.order_number, total } as never,
          });
        } catch {
          // silent
        }

        return Response.json({ ok: true, orderId: order.id });
      },
    },
  },
});
