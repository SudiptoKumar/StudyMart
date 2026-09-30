import { supabase } from "@/integrations/supabase/client";

/**
 * Best-effort activity log writer. Never throws — failures are swallowed
 * so they cannot break the parent admin action.
 */
export async function logActivity(
  action: string,
  entity_type?: string,
  entity_id?: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    await supabase.from("activity_logs").insert({
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      action,
      entity_type: entity_type ?? null,
      entity_id: entity_id ?? null,
      metadata: (metadata ?? null) as never,
    });
  } catch {
    // silent
  }
}
