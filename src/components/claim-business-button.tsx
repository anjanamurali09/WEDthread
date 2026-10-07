import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Only ever rendered for a business with no owner (user_id IS NULL) — see
// call sites. Submitting doesn't attach the account immediately: it opens a
// business_claims row an admin has to approve, same review-only model as
// new-business submissions (see AdminClaimsReview) — not an instant
// self-serve handoff, since anyone signed in could otherwise grab any
// unclaimed listing.
export function ClaimBusinessButton({ businessId, businessName, compact }: { businessId: string; businessName: string; compact?: boolean }) {
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
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setSubmitting(true);
    const { error } = await supabase.from("business_claims").insert({
      business_id: businessId,
      claimant_user_id: u.user.id,
      claimant_email: u.user.email ?? "",
      message: message.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      return toast.error(error.code === "23505" ? "You already have a pending claim on this listing." : error.message);
    }
    setSubmitted(true);
  };

  return (
    <>
      <button type="button" onClick={openDialog}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-line font-medium hover:bg-stone cursor-pointer",
          compact ? "px-3.5 py-1.5 text-xs" : "gap-2 px-6 py-3 text-sm",
        )}>
        <ShieldCheck className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} /> Is this your business? Claim it
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Claim {businessName}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : !signedIn ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">Sign in to request this listing.</p>
              <Link to="/auth" className="mt-3 inline-block text-sm text-cherry underline">Sign in</Link>
            </div>
          ) : submitted ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-sage-deep" />
              <p className="mt-3 text-sm font-medium">Claim request sent</p>
              <p className="mt-1 text-sm text-muted-foreground">The WedThread team will review it and get back to you.</p>
            </div>
          ) : (
            <>
              <div className="py-2">
                <label className="block">
                  <span className="text-sm uppercase tracking-widest text-muted-foreground">A little context (optional)</span>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
                    placeholder="e.g. how we can verify you're the owner"
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
                </label>
              </div>
              <DialogFooter>
                <button type="button" onClick={submit} disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Sending…" : "Request claim"}
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
