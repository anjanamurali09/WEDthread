import { useState } from "react";
import { Star, X, Check } from "lucide-react";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export function FeedbackDialog({ weddingId, onClose }: { weddingId: string | null | undefined; onClose: () => void }) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!weddingId || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("feedback" as any).insert({
      wedding_id: weddingId, rating, message: message.trim() || null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    // The team is emailed as well; this must never get in the way of the thank-you.
    supabase.functions.invoke("notify-team", { body: { kind: "feedback", wedding_id: weddingId } }).catch((err) => console.error("notify-team failed", err));
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-paper rounded-3xl max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div className="text-center py-4">
            <span className="grid h-12 w-12 mx-auto place-items-center rounded-full bg-sage-soft text-sage-deep"><Check className="h-5 w-5" /></span>
            <h3 className="mt-4 font-serif text-2xl">Thank you!</h3>
            <p className="mt-2 text-sm text-muted-foreground">Your feedback helps us make WEDthread better.</p>
            <button onClick={onClose} className="mt-6 rounded-full bg-ink text-paper px-6 py-2 text-sm hover:bg-clay cursor-pointer">Close</button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm uppercase tracking-widest text-clay">Feedback</p>
                <h3 className="font-serif text-2xl">How's it going so far?</h3>
              </div>
              <button onClick={onClose}><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">We're constantly improving and would love your feedback.</p>

            <div className="mt-6 flex items-center justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)}
                  onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
                  className="p-1 cursor-pointer">
                  <Star className={cn("h-8 w-8 transition-colors", n <= (hovered || rating) ? "fill-cherry text-cherry" : "text-line")} />
                </button>
              ))}
            </div>

            <label className="block mt-6"><span className="text-sm uppercase tracking-widest text-muted-foreground">Tell us more (optional)</span>
              <textarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder="What's working well? What could be better?"
                className="mt-1 w-full rounded-2xl border border-line bg-pearl px-4 py-3 text-sm" />
            </label>

            <p className="mt-4 text-sm text-muted-foreground">Your feedback is sent directly to our team, and improvements are made ASAP.</p>

            <div className="mt-3 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-full px-5 py-2 text-sm border border-line hover:bg-stone">Cancel</button>
              <button onClick={submit} disabled={rating === 0 || submitting}
                className="rounded-full bg-cherry text-paper px-6 py-2 text-sm hover:bg-ink disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {submitting ? "Sending…" : "Submit feedback"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
