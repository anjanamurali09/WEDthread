import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { ConversationThreadDialog } from "@/components/conversation-thread-dialog";
import { useActiveRole } from "@/hooks/use-active-role";
import { Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/business/messages")({ component: BusinessMessagesPage });

type ConversationRow = { id: string; coupleName: string; preview: string; updatedAt: string; isNew: boolean };

// Both vendor and venue workspaces share this page — which business's
// conversations to load is whichever business_type matches the currently
// active workspace, same lookup as business.dashboard.tsx. Was hardcoded to
// "vendor" only, so a venue's own enquiries never showed up here.
function BusinessMessagesPage() {
  const qc = useQueryClient();
  const { active } = useActiveRole();
  const wantedType = active === "venue" ? "venue" : "vendor";
  const [openThread, setOpenThread] = useState<ConversationRow | null>(null);

  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["business-conversations", wantedType],
    queryFn: async (): Promise<ConversationRow[]> => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data: business } = await supabase.from("businesses").select("id").eq("user_id", u.user.id).eq("business_type", wantedType).maybeSingle();
      if (!business) return [];

      const { data: convos } = await supabase.from("conversations").select("id,wedding_id,updated_at").eq("business_id", business.id).order("updated_at", { ascending: false });
      if (!convos || convos.length === 0) return [];

      const [{ data: weddings }, { data: msgs }, { data: enquiries }] = await Promise.all([
        supabase.from("weddings").select("id,partner_a,partner_b").in("id", convos.map((c) => c.wedding_id)),
        supabase.from("conversation_messages").select("conversation_id,body,created_at").in("conversation_id", convos.map((c) => c.id)).order("created_at", { ascending: false }),
        supabase.from("enquiries").select("conversation_id,status").in("conversation_id", convos.map((c) => c.id)),
      ]);
      const nameById = new Map((weddings ?? []).map((w) => [w.id, `${w.partner_a} & ${w.partner_b}`]));
      const previewByConvo = new Map<string, string>();
      for (const m of msgs ?? []) if (!previewByConvo.has(m.conversation_id)) previewByConvo.set(m.conversation_id, m.body);
      const newByConvo = new Set((enquiries ?? []).filter((e) => e.status === "new").map((e) => e.conversation_id));

      return convos.map((c) => ({
        id: c.id, coupleName: nameById.get(c.wedding_id) ?? "A couple",
        preview: previewByConvo.get(c.id) ?? "", updatedAt: c.updated_at, isNew: newByConvo.has(c.id),
      }));
    },
  });

  const markReplied = async (conversationId: string) => {
    await supabase.from("enquiries").update({ status: "replied" }).eq("conversation_id", conversationId).eq("status", "new");
    qc.invalidateQueries({ queryKey: ["business-conversations", wantedType] });
  };

  return (
    <AppShell title="Enquiries" subtitle="Couples who found your listing, with their lead form answers at the top of each thread.">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : conversations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground" />
          <h3 className="font-serif text-2xl mt-3">No enquiries yet</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">Couples who enquire about one of your services will show up here.</p>
        </div>
      ) : (
        <div className="grid gap-2 max-w-2xl">
          {conversations.map((c) => (
            <button key={c.id} type="button" onClick={() => setOpenThread(c)}
              className="text-left rounded-2xl border border-line px-5 py-3.5 hover:bg-stone/50 cursor-pointer flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-sm inline-flex items-center gap-2">
                  {c.coupleName}
                  {c.isNew && <span className="text-[10px] uppercase tracking-widest rounded-full px-2 py-0.5 bg-cherry text-pearl">New</span>}
                </p>
                <p className="text-sm text-muted-foreground truncate">{c.preview}</p>
              </div>
              <span className="text-sm text-muted-foreground shrink-0">{new Date(c.updatedAt).toLocaleDateString()}</span>
            </button>
          ))}
        </div>
      )}

      {openThread && (
        <ConversationThreadDialog
          conversationId={openThread.id}
          title={openThread.coupleName}
          senderRole="vendor"
          open={!!openThread}
          onOpenChange={(o) => !o && setOpenThread(null)}
          onMessageSent={() => markReplied(openThread.id)}
        />
      )}
    </AppShell>
  );
}
