import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";
import {
  renderTemplate,
  sendTelegramMessage,
  buildSampleVars,
  renderWebhookUrl,
  sendWebhook,
} from "@/lib/telegram";

const bodySchema = z.object({
  mode: z.enum(["template", "webhook"]).default("template"),
  bot_token: z.string().trim().max(255).optional().default(""),
  chat_id: z.string().trim().max(64).optional().default(""),
  template: z.string().trim().min(1).max(4000),
  webhook_url: z.string().trim().max(2000).optional().default(""),
});

async function getAdminUserId(request: Request): Promise<string | null> {
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
  const userId = data.claims.sub;
  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return roleRow ? userId : null;
}

export const Route = createFileRoute("/api/admin/test-telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const userId = await getAdminUserId(request);
        if (!userId) {
          return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }
        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ ok: false, error: "Invalid input" }, { status: 400 });
        }
        const sample = buildSampleVars();
        const text = renderTemplate(parsed.template, sample);
        let result: { ok: boolean; error?: string };
        if (parsed.mode === "webhook") {
          if (!parsed.webhook_url) {
            return Response.json({ ok: false, error: "Webhook URL is required" }, { status: 400 });
          }
          const url = renderWebhookUrl(parsed.webhook_url, {
            ...sample,
            bot_token: parsed.bot_token,
            chat_id: parsed.chat_id,
            text,
          });
          result = await sendWebhook(url);
        } else {
          if (!parsed.bot_token || !parsed.chat_id) {
            return Response.json(
              { ok: false, error: "Bot token and chat ID are required" },
              { status: 400 },
            );
          }
          result = await sendTelegramMessage(parsed.bot_token, parsed.chat_id, text);
        }
        if (!result.ok) {
          return Response.json({ ok: false, error: result.error }, { status: 400 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
