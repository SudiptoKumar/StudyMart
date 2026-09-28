import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, Copy, Loader2, Save, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_TEMPLATE,
  DEFAULT_WEBHOOK_URL,
  PLACEHOLDERS,
  buildSampleVars,
  buildSendMessageUrl,
  renderTemplate,
  renderWebhookUrl,
  type TelegramSettings,
} from "@/lib/telegram";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity-log";

export const Route = createFileRoute("/admin/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Admin" }] }),
  component: NotificationsPage,
});

type Tab = "setup" | "template";

function NotificationsPage() {
  const [tab, setTab] = useState<Tab>("setup");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [settings, setSettings] = useState<TelegramSettings>({
    enabled: false,
    mode: "template",
    bot_token: "",
    chat_id: "",
    webhook_url: DEFAULT_WEBHOOK_URL,
    template: DEFAULT_TEMPLATE,
    events: { order_created: true, price_drop: false },
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "telegram_notifications")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as unknown as TelegramSettings;
        setSettings({
          enabled: !!v.enabled,
          mode: v.mode === "webhook" ? "webhook" : "template",
          bot_token: v.bot_token || "",
          chat_id: v.chat_id || "",
          webhook_url: v.webhook_url || DEFAULT_WEBHOOK_URL,
          template: v.template || DEFAULT_TEMPLATE,
          events: v.events || { order_created: true, price_drop: false },
        });
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const payload = { ...settings, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "telegram_notifications", value: payload as never },
        { onConflict: "key" },
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Settings saved");
  };

  const sendTest = async () => {
    if (settings.mode === "webhook") {
      if (!settings.webhook_url) {
        toast.error("Webhook URL is required");
        return;
      }
    } else if (!settings.bot_token || !settings.chat_id) {
      toast.error("Bot token and chat ID are required");
      return;
    }
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/test-telegram", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          mode: settings.mode ?? "template",
          bot_token: settings.bot_token,
          chat_id: settings.chat_id,
          webhook_url: settings.webhook_url ?? "",
          template: settings.template,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Test message sent!");
        void logActivity("sent_notification", "telegram", undefined, { mode: settings.mode ?? "template" });
      } else toast.error(data.error || "Failed to send");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setTesting(false);
    }
  };

  const insertPlaceholder = (key: string) => {
    const ta = textareaRef.current;
    const token = `{${key}}`;
    if (!ta) {
      setSettings((s) => ({ ...s, template: s.template + token }));
      return;
    }
    const start = ta.selectionStart ?? ta.value.length;
    const end = ta.selectionEnd ?? ta.value.length;
    const next = settings.template.slice(0, start) + token + settings.template.slice(end);
    setSettings((s) => ({ ...s, template: next }));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + token.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const sampleVars = buildSampleVars();
  const preview = renderTemplate(settings.template, sampleVars);
  const sampleUrl =
    settings.mode === "webhook" && settings.webhook_url
      ? renderWebhookUrl(settings.webhook_url, {
          ...sampleVars,
          bot_token: settings.bot_token,
          chat_id: settings.chat_id,
          text: preview,
        })
      : settings.bot_token && settings.chat_id
        ? buildSendMessageUrl(settings.bot_token, settings.chat_id, preview)
        : "";

  return (
    <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              Send a Telegram message every time an order is placed.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 inline-flex rounded-xl border border-border bg-background p-1">
          {(["setup", "template"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                tab === t ? "bg-brand text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {t === "setup" ? "Telegram setup" : "Message template"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : tab === "setup" ? (
          <div className="space-y-5 rounded-2xl border border-border bg-background p-5">
            <Field label="Delivery mode" hint="How notifications are sent">
              <div className="inline-flex rounded-lg border border-border bg-secondary/40 p-1">
                {(["template", "webhook"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setSettings((s) => ({ ...s, mode: m }))}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      (settings.mode ?? "template") === m
                        ? "bg-brand text-primary-foreground"
                        : "text-muted-foreground hover:bg-background"
                    }`}
                  >
                    {m === "template" ? "Token + Chat ID" : "Custom URL"}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Bot Token" hint="From @BotFather on Telegram">
              <input
                type="password"
                value={settings.bot_token}
                onChange={(e) => setSettings((s) => ({ ...s, bot_token: e.target.value }))}
                placeholder="123456789:ABCDEF…"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </Field>

            <Field label="Chat ID" hint="Your numeric chat ID — see helper below">
              <input
                value={settings.chat_id}
                onChange={(e) => setSettings((s) => ({ ...s, chat_id: e.target.value }))}
                placeholder="123456789"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </Field>

            {settings.mode === "webhook" && (
              <Field
                label="Webhook URL template"
                hint="Use {bot_token}, {chat_id}, {text} + any placeholder"
              >
                <textarea
                  value={settings.webhook_url ?? ""}
                  onChange={(e) => setSettings((s) => ({ ...s, webhook_url: e.target.value }))}
                  rows={4}
                  placeholder={DEFAULT_WEBHOOK_URL}
                  className="w-full rounded-lg border border-border bg-background p-3 font-mono text-xs outline-none focus:ring-2 focus:ring-brand"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Paste any Telegram URL (or other webhook). All <span className="font-mono">{"{placeholders}"}</span> are URL-encoded automatically. To swap your bot/chat later, just edit the Bot Token and Chat ID fields above.
                </p>
                <button
                  onClick={() => setSettings((s) => ({ ...s, webhook_url: DEFAULT_WEBHOOK_URL }))}
                  className="mt-2 text-xs font-semibold text-brand hover:underline"
                >
                  Reset to default URL
                </button>
              </Field>
            )}

            <label className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-semibold">Enabled</p>
                <p className="text-xs text-muted-foreground">Master switch for all Telegram alerts</p>
              </div>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
                className="h-5 w-5 accent-brand"
              />
            </label>

            <label className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-semibold">Send on new order</p>
                <p className="text-xs text-muted-foreground">Notify when a sale completes</p>
              </div>
              <input
                type="checkbox"
                checked={settings.events?.order_created !== false}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    events: { ...(s.events || {}), order_created: e.target.checked },
                  }))
                }
                className="h-5 w-5 accent-brand"
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save settings
              </button>
              <button
                onClick={sendTest}
                disabled={testing}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              >
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send test
              </button>
            </div>

            <div className="rounded-xl bg-secondary/60 p-4 text-sm">
              <p className="mb-2 font-semibold">How to get your token + chat ID</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>
                  Open Telegram → message <span className="font-mono">@BotFather</span> → <span className="font-mono">/newbot</span> → copy the token.
                </li>
                <li>Send any message to your new bot from your account (so it can reply to you).</li>
                <li>
                  Open <span className="font-mono">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</span> in your browser
                  — find <span className="font-mono">"chat":&#123;"id":…&#125;</span>. That number is your chat ID.
                </li>
              </ol>
            </div>
          </div>
        ) : (
          <div className="space-y-5 rounded-2xl border border-border bg-background p-5">
            <Field label="Available placeholders" hint="Click to insert at cursor">
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => insertPlaceholder(p.key)}
                    title={p.description}
                    className="rounded-md border border-border bg-secondary px-2 py-1 font-mono text-xs hover:bg-brand-soft hover:text-brand"
                  >
                    {`{${p.key}}`}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Message template">
              <textarea
                ref={textareaRef}
                value={settings.template}
                onChange={(e) => setSettings((s) => ({ ...s, template: e.target.value }))}
                rows={12}
                className="w-full rounded-lg border border-border bg-background p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-brand"
              />
            </Field>

            <Field label="Live preview" hint="Rendered with sample data">
              <pre className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-3 text-sm">
                {preview}
              </pre>
            </Field>

            {sampleUrl && (
              <Field label="Sample request URL">
                <div className="flex items-start gap-2">
                  <code className="block flex-1 break-all rounded-lg border border-border bg-secondary/40 p-2 text-[11px]">
                    {sampleUrl}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sampleUrl);
                      toast.success("URL copied");
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-secondary"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </button>
                </div>
              </Field>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save template
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, template: DEFAULT_TEMPLATE }))}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
              >
                Reset to default
              </button>
            </div>
          </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label className="text-sm font-semibold">{label}</label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
