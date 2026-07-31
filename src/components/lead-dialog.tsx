import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentWedding } from "@/lib/wedding-hooks";
import { utmParams, type LeadKind } from "@/lib/lead-utm";
import { Send } from "lucide-react";
import { formatNumber } from "@/lib/utils";

type Target = { id: string; name: string; city?: string | null; country?: string | null; currency?: string | null };

export function LeadDialog({
  open,
  onOpenChange,
  kind,
  target,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: LeadKind;
  target: Target | null;
}) {
  const { data: wedding } = useCurrentWedding();
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me-profile"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", u.user.id).maybeSingle();
      return { email: u.user.email ?? "", display_name: p?.display_name ?? "" };
    },
  });

  // Auto-populate from wedding + profile
  useEffect(() => {
    if (!open || !target) return;
    setContactName(me?.display_name || [wedding?.partner_a, wedding?.partner_b].filter(Boolean).join(" & "));
    setContactEmail(me?.email || "");
    setEventDate("");
    setGuestCount(wedding?.est_guest_count ? String(wedding.est_guest_count) : "");
    setMessage(
      `Hi ${target.name},\n\nWe're planning our wedding${
        wedding?.destination_city ? ` in ${wedding.destination_city}${wedding.destination_country ? ", " + wedding.destination_country : ""}` : ""
      }${wedding?.est_guest_count ? ` for around ${formatNumber(wedding.est_guest_count)} guests` : ""}. Could you share availability and packages?\n\nThank you!`,
    );
  }, [open, target, wedding, me]);

  if (!target) return null;

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in to send an inquiry.");
      const utm = utmParams(kind, "inquiry", target.id);
      const row: any = {
        sender_user_id: u.user.id,
        wedding_id: wedding?.id ?? null,
        message,
        contact_name: contactName || null,
        contact_email: contactEmail || null,
        contact_phone: contactPhone || null,
        event_date: eventDate || null,
        guest_count: guestCount ? Number(guestCount) : null,
        city: wedding?.destination_city ?? null,
        country: wedding?.destination_country ?? null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
        currency: target.currency ?? null,
        utm_source: utm.utm_source,
        utm_medium: utm.utm_medium,
        utm_campaign: utm.utm_campaign,
        utm_content: utm.utm_content,
      };
      if (kind === "vendor") row.target_vendor_id = target.id;
      else row.target_venue_id = target.id;

      const { error } = await supabase.from("booking_leads" as any).insert(row);
      if (error) throw error;
      toast.success(`Inquiry sent to ${target.name}.`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Could not send inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl bg-pearl border-line p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 pb-4 border-b border-line/60">
          <DialogTitle className="font-serif text-2xl">I'm interested in {target.name}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            We'll send them your wedding details so they can check availability.
          </DialogDescription>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <Field label="Your name">
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className="input" /></Field>
            <Field label="Phone / WhatsApp"><input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="input" placeholder="+971 …" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Wedding date"><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="input" /></Field>
            <Field label="Guest count"><input type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} className="input" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Budget min${target.currency ? ` (${target.currency})` : ""}`}><input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} className="input" /></Field>
            <Field label="Budget max"><input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} className="input" /></Field>
          </div>
          <Field label="Message">
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} className="input resize-none" />
          </Field>
          <button
            onClick={submit}
            disabled={submitting || !message.trim()}
            className="w-full rounded-full bg-cherry text-pearl px-5 py-3 text-sm font-medium hover:bg-wine transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> {submitting ? "Sending…" : "Send inquiry"}
          </button>
        </div>
        <style>{`.input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:0.75rem;padding:0.55rem 0.75rem;font-size:0.875rem}.input:focus{outline:none;border-color:var(--cherry);box-shadow:0 0 0 3px color-mix(in oklab,var(--cherry),transparent 80%)}`}</style>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
