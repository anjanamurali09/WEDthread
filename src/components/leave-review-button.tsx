import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { Star, Loader2 } from "lucide-react";

type Eligibility = "checking" | "signed-out" | "no-wedding" | "eligible";

// Any signed-in couple/planner with a wedding can review — no requirement to
// have enquired through WedThread first, since plenty of couples will have
// reached out or experienced a venue/vendor outside the platform. The RLS
// policy on `reviews` enforces the same (wedding-access-only) check
// independently, so this is a UX convenience, not the real gate.
export function LeaveReviewButton({ businessId, businessName, onSaved }: { businessId: string; businessName: string; onSaved?: () => void }) {
  const [status, setStatus] = useState<Eligibility>("checking");
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setStatus("signed-out"); return; }
      const { data: wedding } = await supabase.rpc("get_my_current_wedding");
      const wid = (wedding as any)?.id ?? null;
      if (!wid) { setStatus("no-wedding"); return; }
      setWeddingId(wid);
      setStatus("eligible");

      const { data: existing } = await supabase.from("reviews").select("rating,review_text").eq("wedding_id", wid).eq("business_id", businessId).maybeSingle();
      if (existing) { setRating(existing.rating); setText(existing.review_text ?? ""); }
    })();
  }, [businessId]);

  const submit = async () => {
    if (!weddingId || rating < 1) return toast.error("Pick a star rating.");
    setSubmitting(true);
    const { error } = await supabase.from("reviews").upsert(
      { business_id: businessId, wedding_id: weddingId, rating, review_text: text.trim() || null },
      { onConflict: "business_id,wedding_id" },
    );
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for the review!");
    setOpen(false);
    onSaved?.();
  };

  if (status === "checking") return null;

  if (status === "signed-out") {
    return <p className="text-sm text-muted-foreground">Sign in to leave a review.</p>;
  }
  if (status === "no-wedding") {
    return <p className="text-sm text-muted-foreground">Set up your wedding to leave a review.</p>;
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-clay underline hover:text-wine cursor-pointer">
        Leave a review
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Review {businessName}</DialogTitle>
          </DialogHeader>
          <div className="py-2 grid gap-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  onMouseEnter={() => setHoverRating(n)} onMouseLeave={() => setHoverRating(0)}
                  className="cursor-pointer">
                  <Star className={`h-7 w-7 ${n <= (hoverRating || rating) ? "fill-cherry text-cherry" : "text-line"}`} />
                </button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} placeholder="How was it? (optional)"
              className="w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
          </div>
          <DialogFooter>
            <button type="button" onClick={submit} disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Saving…" : "Submit review"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
