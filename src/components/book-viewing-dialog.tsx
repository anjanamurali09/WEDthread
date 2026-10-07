import { useState } from "react";
import { track } from "@/lib/analytics";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/datepicker";
import { toast } from "@/lib/toast";
import { CalendarCheck, Loader2, CheckCircle2 } from "lucide-react";

const TIME_SLOTS = ["Morning", "Afternoon", "Evening"] as const;

// Two modes, decided once by whichever the business has set: if they've
// added an external calendar link (Calendly or similar), this is just a
// plain link out to it — no dialog. Otherwise it opens a lightweight
// time-slot request: date + time of day + an optional note, submitted
// through the same lead_form_submissions → submit-enquiry pipeline every
// other enquiry uses (so it shows up in the vendor's normal inbox too), plus
// an email to the business owner specifically for this one.
export function BookViewingDialog({ businessId, businessName, bookingLinkUrl }: {
  businessId: string; businessName: string; bookingLinkUrl: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [date, setDate] = useState("");
  const [timeSlot, setTimeSlot] = useState<string>("");
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
    if (!date) return toast.error("Pick a preferred date.");
    if (!timeSlot) return toast.error("Pick a preferred time.");
    setSubmitting(true);

    const { data: wedding } = await supabase.rpc("get_my_current_wedding");
    const weddingId = (wedding as any)?.id ?? null;
    if (!weddingId) {
      setSubmitting(false);
      return toast.error("Set up your wedding first.");
    }

    const responses = { "Request type": "Viewing tour", "Preferred date": date, "Preferred time": timeSlot, "Message": message.trim() };
    const { data: submission, error } = await supabase.from("lead_form_submissions").insert({
      lead_form_id: null, vendor_service_id: null, business_id: businessId, wedding_id: weddingId, responses,
    }).select("id").single();
    if (error || !submission) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Could not send your request.");
    }

    const { data: result, error: fnError } = await supabase.functions.invoke<{ success?: boolean; error?: string }>("submit-enquiry", {
      body: { lead_form_submission_id: submission.id },
    });
    setSubmitting(false);
    if (fnError || !result?.success) {
      return toast.error(result?.error === "no_payment_method" ? "Please add a payment method to send this request." : "Could not send your request. Please try again.");
    }

    // The enquiry itself already succeeded — email is a nice-to-have on top,
    // never something that should undo it if Resend has a bad day.
    supabase.functions.invoke("notify-viewing-request", {
      body: { business_id: businessId, wedding_id: weddingId, preferred_date: date, preferred_time: timeSlot, message: message.trim(), origin: window.location.origin },
    }).catch((err) => console.error("notify-viewing-request failed", err));

    track("viewing_requested");
    setSubmitted(true);
  };

  if (bookingLinkUrl) {
    return (
      <a href={bookingLinkUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium hover:bg-stone cursor-pointer">
        <CalendarCheck className="h-4 w-4" /> Book a viewing
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={openDialog}
        className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-sm font-medium hover:bg-stone cursor-pointer">
        <CalendarCheck className="h-4 w-4" /> Book a viewing
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book a viewing at {businessName}</DialogTitle>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground py-4">Loading…</p>
          ) : !signedIn ? (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">Sign in as a couple to request a viewing.</p>
              <Link to="/auth" className="mt-3 inline-block text-sm text-cherry underline">Sign in</Link>
            </div>
          ) : submitted ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-sage-deep" />
              <p className="mt-3 text-sm font-medium">Request sent</p>
              <p className="mt-1 text-sm text-muted-foreground">{businessName} will reply in your Messages.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-2">
                <label className="block">
                  <span className="text-sm uppercase tracking-widest text-muted-foreground">Preferred date</span>
                  <div className="mt-1"><DatePicker value={date} onChange={setDate} /></div>
                </label>
                <label className="block">
                  <span className="text-sm uppercase tracking-widest text-muted-foreground">Preferred time</span>
                  <div className="mt-1.5 flex gap-2">
                    {TIME_SLOTS.map((slot) => (
                      <button key={slot} type="button" onClick={() => setTimeSlot(slot)}
                        className={`rounded-full px-4 py-2 text-sm cursor-pointer border transition-colors ${
                          timeSlot === slot ? "bg-ink text-paper border-ink" : "border-line text-muted-foreground hover:bg-stone"
                        }`}>
                        {slot}
                      </button>
                    ))}
                  </div>
                </label>
                <label className="block">
                  <span className="text-sm uppercase tracking-widest text-muted-foreground">Note (optional)</span>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="Anything the venue should know?"
                    className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
                </label>
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={submit} disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? "Sending…" : "Request viewing"}
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
