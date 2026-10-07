import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { LeaveReviewButton } from "@/components/leave-review-button";
import { toast } from "@/lib/toast";
import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  sender_role: "couple" | "vendor" | "system";
  body: string;
  created_at: string;
};

// Shared thread view for both sides of an enquiry conversation — the couple
// (messages.tsx) and the vendor (business.messages.tsx). Which side "you"
// are is just `senderRole`; the row alignment flips accordingly. The lead
// form's answers are already the first message in the thread (submit-enquiry
// posts them as such), so they naturally show "at the top" with no special
// casing here.
export function ConversationThreadDialog({ conversationId, title, subtitle, senderRole, open, onOpenChange, onMessageSent, reviewBusiness }: {
  conversationId: string;
  title: string;
  subtitle?: string;
  senderRole: "couple" | "vendor";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMessageSent?: () => void;
  // Couple side only: renders a "Leave a review" entry point in the thread
  // header once this conversation's business is passed in — the eligibility
  // check (an enquiries row must actually link this wedding+business) still
  // happens inside LeaveReviewButton itself.
  reviewBusiness?: { id: string; name: string };
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["conversation-messages", conversationId],
    enabled: open,
    queryFn: async (): Promise<Message[]> => {
      const { data } = await supabase.from("conversation_messages").select("id,sender_role,body,created_at").eq("conversation_id", conversationId).order("created_at");
      return (data ?? []) as Message[];
    },
  });

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSending(true);
    const { error } = await supabase.from("conversation_messages").insert({
      conversation_id: conversationId, sender_role: senderRole, sender_user_id: u.user.id, body,
    });
    setSending(false);
    if (error) return toast.error(error.message);
    setDraft("");
    qc.invalidateQueries({ queryKey: ["conversation-messages", conversationId] });
    onMessageSent?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>{title}</DialogTitle>
            {reviewBusiness && <LeaveReviewButton businessId={reviewBusiness.id} businessName={reviewBusiness.name} />}
          </div>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Loading…</p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-3 py-2 pr-1">
            {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
            {messages.map((m) => {
              const mine = m.sender_role === senderRole;
              return (
                <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
                    mine ? "bg-ink text-paper" : "bg-stone text-ink",
                  )}>
                    {m.body}
                    <p className={cn("mt-1 text-[10px] uppercase tracking-widest", mine ? "text-paper/60" : "text-muted-foreground")}>
                      {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row items-stretch gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Write a reply…"
            rows={2}
            className="flex-1 rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay"
          />
          <button type="button" onClick={send} disabled={sending || !draft.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-ink text-paper px-6 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
