import { useEffect, useState } from "react";
import { MessageCircle, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Comment = {
  id: string;
  product_id: string;
  user_id: string;
  body: string;
  created_at: string;
};

type Profile = { user_id: string; display_name: string | null };

export function ProductComments({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("product_comments")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as Comment[];
    setComments(list);
    setLoading(false);

    const ids = Array.from(new Set(list.map((c) => c.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      ((profs ?? []) as Profile[]).forEach((p) => {
        map[p.user_id] = p.display_name || "User";
      });
      setProfiles(map);
    }
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`comments-${productId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_comments", filter: `product_id=eq.${productId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const post = async () => {
    if (!user) return toast.error("Sign in to comment");
    const trimmed = body.trim();
    if (!trimmed) return;
    setPosting(true);
    const { error } = await supabase
      .from("product_comments")
      .insert({ product_id: productId, user_id: user.id, body: trimmed });
    setPosting(false);
    if (error) return toast.error(error.message);
    setBody("");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("product_comments").delete().eq("id", id);
    if (error) return toast.error(error.message);
  };

  return (
    <section className="mt-4 rounded-2xl bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Comments</h2>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          {comments.length}
        </span>
      </div>

      {user ? (
        <div className="mt-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your thoughts…"
            rows={2}
            maxLength={2000}
            className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{body.length}/2000</span>
            <button
              onClick={post}
              disabled={posting || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
            >
              {posting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Post
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Sign in to join the discussion.</p>
      )}

      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : comments.length === 0 ? (
          <p className="text-xs text-muted-foreground">Be the first to comment.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-xl bg-secondary/50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">
                  {profiles[c.user_id] || "User"}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(c.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{c.body}</p>
              {user?.id === c.user_id && (
                <button
                  onClick={() => remove(c.id)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
