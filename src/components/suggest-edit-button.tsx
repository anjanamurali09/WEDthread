import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { Loader2, CheckCircle2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

// Available on any business, claimed or not — a couple might notice a
// vendor's own claimed listing has outdated info too, not just an unclaimed
// one. Like a claim request, this never edits the business directly: it's
// a message an admin reviews and, if they agree, applies themselves via the
// admin edit form (unclaimed) or by contacting the owner (claimed).
export function SuggestEditButton({ businessId, businessName, compact }: { businessId: string; businessName: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const openDialog = async () => {
    setOpen(true);
    setLoading(true);
    setSubmitted(false);
    const { data: u } = await supabase.auth.getUser();
    setSignedIn(!!u.user);
    setLoading(false);
  };

  const submit = async () => {
    if (!message.trim()) return toast.error("Add a note about what should change.");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSubmitting(true);
    const { error } = await supabase.from("business_suggestions").insert({
      business_id: businessId,
      suggested_by_user_id: u.user.id,
      suggested_by_email: u.user.email ?? "",
      message: message.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setSubmitted(true);
    setMessage("");
  };

  return (
    <>
      <button type="button" onClick={openDialog}
        className={cn("inline-flex items-center gap-1.5 text-muted-foreground hover:text-cherry cursor-pointer", compact ? "text-xs" : "text-sm")}>
        <Pencil className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} /> Suggest a change
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Suggest a change to {businessName}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : !signedIn ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">Sign in to suggest a change.</p>
              <Link to="/auth" className="mt-3 inline-block text-sm text-cherry underline">Sign in</Link>
            </div>
          ) : submitted ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-sage-deep" />
              <p className="mt-3 text-sm font-medium">Thanks. Sent to the WEDthread team.</p>
            </div>
          ) : (
            <>
              <div className="py-2">
                <label className="block">
                  <span className="text-sm uppercase tracking-widest text-muted-foreground">What should change?</span>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                    placeholder="e.g. the phone number is out of date, the address has changed…"
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
                </label>
              </div>
              <DialogFooter>
                <button type="button" onClick={submit} disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Sending…" : "Send suggestion"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
