// Shared Telegram helpers — pure functions, safe for client + server.

export type TelegramSettings = {
  enabled: boolean;
  /** "template" = build URL from bot_token + chat_id; "webhook" = use webhook_url verbatim */
  mode?: "template" | "webhook";
  bot_token: string;
  chat_id: string;
  /** Full URL with {placeholders}. Use the {text} placeholder to inject the rendered message. */
  webhook_url?: string;
  template: string;
  events?: { order_created?: boolean; price_drop?: boolean };
  updated_at?: string;
};

export const DEFAULT_WEBHOOK_URL =
  "https://api.telegram.org/bot{bot_token}/sendMessage?chat_id={chat_id}&text={text}";

export const DEFAULT_TEMPLATE = `🥳 Congratulations 🎉
Order: {order_id}
🏆🤑 New sale 💸🏆
Customer: {customer_name}
From: {country}
Products: {product_titles}
Payment: {payment_method}
Total: {total} {currency}
OS: {os}
Browser: {browser}
IP: {ip}`;

export const PLACEHOLDERS: { key: string; description: string }[] = [
  { key: "order_id", description: "Order number (e.g. FP-A1B2C3D4)" },
  { key: "customer_name", description: "Customer display name" },
  { key: "customer_email", description: "Customer email" },
  { key: "products", description: "Multi-line product list" },
  { key: "product_titles", description: "Comma-separated titles" },
  { key: "total", description: "Order total" },
  { key: "subtotal", description: "Subtotal before discount" },
  { key: "discount", description: "Discount amount" },
  { key: "currency", description: "Currency code (BDT)" },
  { key: "payment_method", description: "card / apple / wallet" },
  { key: "coupon_code", description: "Coupon code applied" },
  { key: "country", description: "Country (ISO code)" },
  { key: "ip", description: "Client IP address" },
  { key: "user_agent", description: "Raw user-agent string" },
  { key: "device", description: "mobile / tablet / desktop" },
  { key: "os", description: "Operating system" },
  { key: "browser", description: "Browser name" },
  { key: "referrer", description: "HTTP referrer" },
  { key: "language", description: "Browser language" },
  { key: "date", description: "Order date" },
  { key: "time", description: "Order time" },
];

export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{([a-z_]+)\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null || v === "") return "—";
    return String(v);
  });
}

// Tiny user-agent parser, Worker-safe (no regex catastrophic backtracking).
export function parseUserAgent(ua: string): { os: string; browser: string; device: string } {
  const u = ua || "";
  let os = "Unknown";
  if (/Windows NT 10/i.test(u)) os = "Windows 10/11";
  else if (/Windows NT/i.test(u)) os = "Windows";
  else if (/Mac OS X/i.test(u)) os = "macOS";
  else if (/Android/i.test(u)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(u)) os = "iOS";
  else if (/Linux/i.test(u)) os = "Linux";

  let browser = "Unknown";
  if (/Edg\//i.test(u)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(u)) browser = "Opera";
  else if (/Chrome\//i.test(u) && !/Chromium/i.test(u)) browser = "Chrome";
  else if (/Firefox\//i.test(u)) browser = "Firefox";
  else if (/Safari\//i.test(u)) browser = "Safari";

  let device = "desktop";
  if (/Tablet|iPad/i.test(u)) device = "tablet";
  else if (/Mobi|Android|iPhone|iPod/i.test(u)) device = "mobile";

  return { os, browser, device };
}

export function buildSampleVars(): Record<string, string> {
  return {
    order_id: "FP-A1B2C3D4",
    customer_name: "Jane Doe",
    customer_email: "jane@example.com",
    products: "• Study Pack Pro × 1\n• Math Bundle × 2",
    product_titles: "Study Pack Pro, Math Bundle",
    total: "49.00",
    subtotal: "59.00",
    discount: "10.00",
    currency: "BDT",
    payment_method: "card",
    coupon_code: "SAVE10",
    country: "US",
    ip: "203.0.113.42",
    user_agent: "Mozilla/5.0 ...",
    device: "mobile",
    os: "iOS",
    browser: "Safari",
    referrer: "https://google.com",
    language: "en-US",
    date: new Date().toISOString().slice(0, 10),
    time: new Date().toISOString().slice(11, 19),
  };
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Build a copy-pasteable GET URL that mirrors the user's example format.
export function buildSendMessageUrl(botToken: string, chatId: string, text: string): string {
  const base = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const params = new URLSearchParams({ chat_id: chatId, text });
  return `${base}?${params.toString()}`;
}

/**
 * Render a webhook URL template by URL-encoding each placeholder value.
 * Supports {bot_token}, {chat_id}, {text}, plus any vars passed in (order_id, country, etc.).
 */
export function renderWebhookUrl(
  urlTemplate: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  return urlTemplate.replace(/\{([a-z_]+)\}/g, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null) return "";
    return encodeURIComponent(String(v));
  });
}

/** Fire a GET request to a fully-rendered webhook URL. */
export async function sendWebhook(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: body.slice(0, 200) || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

