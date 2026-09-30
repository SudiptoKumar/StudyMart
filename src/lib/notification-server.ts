// Server-only: sends Telegram notifications after orders.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  renderTemplate,
  parseUserAgent,
  sendTelegramMessage,
  renderWebhookUrl,
  sendWebhook,
  type TelegramSettings,
} from "./telegram";

export type ClientMeta = {
  user_agent?: string | null;
  language?: string | null;
  referrer?: string | null;
  screen?: string | null;
};

function pickIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    ""
  );
}

export async function loadTelegramSettings(): Promise<TelegramSettings | null> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("value")
    .eq("key", "telegram_notifications")
    .maybeSingle();
  if (!data) return null;
  return data.value as unknown as TelegramSettings;
}

export async function sendOrderNotification(
  orderId: string,
  clientMeta: ClientMeta,
  request: Request,
): Promise<void> {
  try {
    const settings = await loadTelegramSettings();
    if (!settings || !settings.enabled || !settings.bot_token || !settings.chat_id) return;
    if (settings.events && settings.events.order_created === false) return;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (!order) return;

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_title, product_slug, unit_price, quantity")
      .eq("order_id", orderId);

    const list = items ?? [];
    const productTitles = list.map((i) => i.product_title).join(", ");
    const productsMultiline = list
      .map((i) => `• ${i.product_title} × ${i.quantity}`)
      .join("\n");
    const subtotal = list.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);

    // Customer info from auth
    let customerName = order.customer_name || "";
    let customerEmail = order.customer_email || "";
    if (!customerEmail || !customerName) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("display_name")
        .eq("user_id", order.user_id)
        .maybeSingle();
      if (profile?.display_name && !customerName) customerName = profile.display_name;
    }
    if (!customerEmail) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      customerEmail = u?.user?.email || "";
      if (!customerName) customerName = u?.user?.user_metadata?.display_name || customerEmail || "Customer";
    }

    const ua = clientMeta.user_agent || request.headers.get("user-agent") || "";
    const parsed = parseUserAgent(ua);
    const country = request.headers.get("cf-ipcountry") || "";
    const ip = pickIp(request);
    const now = new Date();

    const vars: Record<string, string | number> = {
      order_id: order.order_number,
      customer_name: customerName,
      customer_email: customerEmail,
      products: productsMultiline,
      product_titles: productTitles,
      total: Number(order.total_amount).toFixed(2),
      subtotal: subtotal.toFixed(2),
      discount: Number(order.discount_amount || 0).toFixed(2),
      currency: "BDT",
      payment_method: order.payment_method || "",
      coupon_code: order.coupon_code || "",
      country,
      ip,
      user_agent: ua,
      device: parsed.device,
      os: parsed.os,
      browser: parsed.browser,
      referrer: clientMeta.referrer || "",
      language: clientMeta.language || request.headers.get("accept-language") || "",
      date: now.toISOString().slice(0, 10),
      time: now.toISOString().slice(11, 19),
    };

    const text = renderTemplate(settings.template, vars);

    let result: { ok: boolean; error?: string };
    if (settings.mode === "webhook" && settings.webhook_url) {
      const url = renderWebhookUrl(settings.webhook_url, {
        ...vars,
        bot_token: settings.bot_token,
        chat_id: settings.chat_id,
        text,
      });
      result = await sendWebhook(url);
    } else {
      result = await sendTelegramMessage(settings.bot_token, settings.chat_id, text);
    }

    if (!result.ok) {
      await supabaseAdmin.from("activity_logs").insert({
        action: "telegram_notification_failed",
        entity_type: "order",
        entity_id: orderId,
        metadata: { error: result.error },
      });
    }
  } catch (e) {
    // Never let notification failure break the order.
    try {
      await supabaseAdmin.from("activity_logs").insert({
        action: "telegram_notification_error",
        entity_type: "order",
        entity_id: orderId,
        metadata: { error: (e as Error).message },
      });
    } catch {
      // ignore
    }
  }
}
