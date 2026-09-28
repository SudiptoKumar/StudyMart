import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";

export const Route = createFileRoute("/admin/logs")({
  component: AdminLogs,
});

type Log = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function AdminLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data ?? []) as Log[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Activity log" subtitle="Last 100 events" />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="admin-skeleton h-12 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity yet" description="Admin actions will be tracked here." />
      ) : (
        <div className="admin-card overflow-hidden">
          <ul className="divide-y divide-border">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">{l.actor_email ?? "system"}</span>{" "}
                    <span className="text-muted-foreground">{l.action}</span>{" "}
                    {l.entity_type && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {l.entity_type}/{l.entity_id?.slice(0, 8)}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
