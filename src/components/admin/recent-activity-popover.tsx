import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Log = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function RecentActivityPopover() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("id,actor_email,action,entity_type,created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    setLogs((data ?? []) as Log[]);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-activity-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-lg hover:bg-secondary"
          aria-label="Recent activity"
        >
          <Bell className="h-4 w-4" />
          {logs.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-brand" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-semibold">Recent activity</span>
          <Link
            to="/admin/logs"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>
        {logs.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">No activity yet.</div>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {logs.map((l) => (
              <li key={l.id} className="px-3 py-2.5">
                <p className="text-xs">
                  <span className="font-semibold">{l.actor_email ?? "system"}</span>{" "}
                  <span className="text-muted-foreground">{l.action}</span>
                  {l.entity_type && (
                    <span className="ml-1 text-muted-foreground/70">· {l.entity_type}</span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(l.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
