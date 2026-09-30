import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const bodySchema = z.object({
  code: z.string().trim().min(1).max(64),
  subtotal: z.number().min(0).max(1_000_000),
});

export const Route = createFileRoute("/api/coupons/validate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          const body = await request.json();
          parsed = bodySchema.parse(body);
        } catch {
          return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });
        }

        const { data: coupon } = await supabaseAdmin
          .from("coupons")
          .select("*")
          .ilike("code", parsed.code)
          .maybeSingle();

        if (!coupon) return Response.json({ ok: false, error: "Invalid coupon code" });
        if (!coupon.active) return Response.json({ ok: false, error: "This coupon is no longer active" });
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
          return Response.json({ ok: false, error: "This coupon has expired" });
        }
        if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
          return Response.json({ ok: false, error: "This coupon has reached its usage limit" });
        }
        if (coupon.min_amount != null && parsed.subtotal < Number(coupon.min_amount)) {
          return Response.json({ ok: false, error: `Minimum order of $${coupon.min_amount} required` });
        }

        let discountAmount = 0;
        if (coupon.discount_type === "percent") {
          discountAmount = (parsed.subtotal * Number(coupon.discount_value)) / 100;
        } else {
          discountAmount = Number(coupon.discount_value);
        }
        discountAmount = Math.min(discountAmount, parsed.subtotal);
        discountAmount = Math.round(discountAmount * 100) / 100;

        return Response.json({
          ok: true,
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: Number(coupon.discount_value),
          discountAmount,
          description: coupon.description,
        });
      },
    },
  },
});
