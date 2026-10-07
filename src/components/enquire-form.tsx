import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dropdown } from "@/components/dropdown";
import { DatePicker } from "@/components/ui/datepicker";
import { toast } from "@/lib/toast";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldType = "text" | "number" | "textarea" | "date" | "select";
type LeadField = { id: string; label: string; field_type: FieldType; options: string[]; required: boolean };

// Two short fields side by side (full name + email, phone + guests, …) is
// what actually makes the form compact — only a freeform field (textarea,
// or the fallback set's own "preferred dates" note) needs the full row.
function fieldSpan(f: LeadField): "full" | "half" {
  if (f.field_type === "textarea" || f.id === "preferred_dates") return "full";
  return "half";
}

// The generic fallback used whenever the vendor hasn't built a custom lead
// form yet for this service/venue — has no real id, so submissions from it
// carry lead_form_id: null. These labels double as the keys "Save my
// answers for next time" reads/writes in wedding_enquiry_defaults, so they
// stay fixed regardless of which listing this renders for.
function fallbackFields(kind: "venue" | "vendor"): LeadField[] {
  return [
    { id: "full_name", label: "Full name", field_type: "text", options: [], required: true },
    { id: "email", label: "Email", field_type: "text", options: [], required: true },
    { id: "phone", label: "Phone number", field_type: "text", options: [], required: false },
    { id: "approx_guests", label: "Approx. guests", field_type: "number", options: [], required: false },
    { id: "preferred_dates", label: "Preferred dates or months", field_type: "text", options: [], required: false },
    { id: "message", label: `What would you like from ${kind === "venue" ? "the venue" : "this vendor"}?`, field_type: "textarea", options: [], required: false },
  ];
}

// The actual enquiry form — fields, submit, success state — with no opinion
// about what contains it. Extracted out of VendorEnquireDialog so the exact
// same form can render inside a centered Dialog (the public service/venue
// pages) or inline in a plain page panel (the embedded "Browse vendors"
// three-column layout, which explicitly wants no modal/overlay).
//
// Pass exactly one of vendorServiceId (a vendor's service) or businessId (a
// venue, which has no sub-services): the lead form lookup and the
// submission both key off whichever one is present.
export function EnquireForm({ vendorServiceId, businessId, businessName, onSubmitted }: {
  vendorServiceId?: string; businessId?: string; businessName?: string; onSubmitted?: () => void;
}) {
  const kind: "venue" | "vendor" = vendorServiceId ? "vendor" : "venue";
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [weddingId, setWeddingId] = useState<string | null>(null);
  const [leadFormId, setLeadFormId] = useState<string | null>(null);
  const [fields, setFields] = useState<LeadField[]>(fallbackFields(kind));
  const [values, setValues] = useState<Record<string, string>>({});
  const [saveAnswers, setSaveAnswers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSubmitted(false);
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setSignedIn(false); setLoading(false); return; }
      setSignedIn(true);

      const formQuery = vendorServiceId
        ? supabase.from("lead_forms").select("id").eq("vendor_service_id", vendorServiceId).maybeSingle()
        : supabase.from("lead_forms").select("id").eq("business_id", businessId!).is("vendor_service_id", null).maybeSingle();
      // Wave 1: whichever of these don't need the wedding id yet.
      const [{ data: wedding }, { data: form }] = await Promise.all([
        supabase.rpc("get_my_current_wedding"),
        formQuery,
      ]);
      const wid = (wedding as any)?.id ?? null;
      setWeddingId(wid);

      const usingFallback = !form;
      if (form) setLeadFormId(form.id); else setLeadFormId(null);

      // Wave 2: everything that only depends on wid/form, fired together
      // instead of one after another — this is what actually keeps the
      // dialog from sitting on "Loading…" for three round trips in a row.
      const [eventsRes, fieldsRes, defaultsRes] = await Promise.all([
        wid
          ? supabase.from("events").select("event_date").eq("wedding_id", wid).not("event_date", "is", null).order("event_date").limit(1)
          : Promise.resolve({ data: null as { event_date: string }[] | null }),
        form
          ? supabase.from("lead_form_fields").select("id,label,field_type,options,required").eq("lead_form_id", form.id).order("sort_order")
          : Promise.resolve({ data: null as LeadField[] | null }),
        usingFallback && wid
          ? supabase.from("wedding_enquiry_defaults").select("*").eq("wedding_id", wid).maybeSingle()
          : Promise.resolve({ data: null as { full_name: string | null; email: string | null; phone: string | null; approx_guests: number | null; preferred_dates: string | null } | null }),
      ]);

      let activeFields = fallbackFields(kind);
      if (fieldsRes.data && fieldsRes.data.length > 0) {
        activeFields = fieldsRes.data.map((r: any) => ({ ...r, options: (r.options as string[]) ?? [] })) as LeadField[];
      }
      setFields(activeFields);

      const soonestDate = eventsRes.data?.[0]?.event_date ?? null;
      const initial: Record<string, string> = {};
      for (const f of activeFields) if (f.field_type === "date" && soonestDate) initial[f.label] = soonestDate;

      // Prefill the fixed fallback fields from the couple's saved defaults
      // (or just their account email, the first time) — never the message,
      // since that's specific to this enquiry, not reusable across vendors.
      if (usingFallback && wid) {
        const defaults = defaultsRes.data;
        if (defaults) {
          if (defaults.full_name) initial["Full name"] = defaults.full_name;
          if (defaults.email) initial["Email"] = defaults.email;
          if (defaults.phone) initial["Phone number"] = defaults.phone;
          if (defaults.approx_guests != null) initial["Approx. guests"] = String(defaults.approx_guests);
          if (defaults.preferred_dates) initial["Preferred dates or months"] = defaults.preferred_dates;
        } else if (u.user.email) {
          initial["Email"] = u.user.email;
        }
      }
      setValues(initial);
      setLoading(false);
    })();
  }, [vendorServiceId, businessId]);

  const submit = async () => {
    const missing = fields.find((f) => f.required && !values[f.label]?.trim());
    if (missing) return toast.error(`Please fill in "${missing.label}".`);
    if (!weddingId) return;
    setSubmitting(true);
    const { data: submission, error } = await supabase.from("lead_form_submissions").insert({
      lead_form_id: leadFormId,
      vendor_service_id: vendorServiceId ?? null,
      business_id: vendorServiceId ? null : businessId,
      wedding_id: weddingId,
      responses: values,
    }).select("id").single();
    if (error || !submission) {
      setSubmitting(false);
      return toast.error(error?.message ?? "Could not send your enquiry.");
    }

    // submit-enquiry turns the raw submission into a real enquiry: it
    // creates/reuses the conversation with this vendor and posts these
    // answers as the thread's first message. Charging (currently off) is
    // handled entirely inside the function — this call never surfaces a
    // payment prompt while it's off.
    const { data: result, error: fnError } = await supabase.functions.invoke<{ success?: boolean; error?: string }>("submit-enquiry", {
      body: { lead_form_submission_id: submission.id },
    });
    setSubmitting(false);
    if (fnError || !result?.success) {
      return toast.error(result?.error === "no_payment_method" ? "Please add a payment method to send this enquiry." : "Could not send your enquiry. Please try again.");
    }

    if (!leadFormId && saveAnswers) {
      await supabase.from("wedding_enquiry_defaults").upsert({
        wedding_id: weddingId,
        full_name: values["Full name"]?.trim() || null,
        email: values["Email"]?.trim() || null,
        phone: values["Phone number"]?.trim() || null,
        approx_guests: values["Approx. guests"] ? Number(values["Approx. guests"]) : null,
        preferred_dates: values["Preferred dates or months"]?.trim() || null,
      });
    }
    setSubmitted(true);
    onSubmitted?.();
  };

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading…</p>;

  if (!signedIn) {
    return (
      <div className="py-4">
        <p className="text-sm text-muted-foreground">Sign in as a couple to send an enquiry.</p>
        <Link to="/auth" className="mt-3 inline-block text-sm text-cherry underline">Sign in</Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="py-6 text-center">
        <CheckCircle2 className="h-8 w-8 mx-auto text-sage-deep" />
        <p className="mt-3 text-sm font-medium">Enquiry sent</p>
        <p className="mt-1 text-sm text-muted-foreground">{businessName ?? "The vendor"} will reply in your Messages.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5 max-[380px]:grid-cols-1">
        {fields.map((f) => (
          <label key={f.id} className={cn("block", fieldSpan(f) === "full" && "col-span-2 max-[380px]:col-span-1")}>
            <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
              {f.label}{f.required && <span className="text-cherry ml-0.5">*</span>}
            </span>
            <div className="mt-1">
              {f.field_type === "textarea" ? (
                <textarea value={values[f.label] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.label]: e.target.value }))} rows={2}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-clay" />
              ) : f.field_type === "date" ? (
                <DatePicker value={values[f.label]} onChange={(v) => setValues((val) => ({ ...val, [f.label]: v }))} />
              ) : f.field_type === "select" ? (
                <Dropdown value={values[f.label] ?? ""} onChange={(v) => setValues((val) => ({ ...val, [f.label]: v }))}
                  placeholder="Choose…" options={f.options.map((o) => ({ value: o, label: o }))} />
              ) : (
                <input type="text" inputMode={f.field_type === "number" ? "numeric" : "text"} value={values[f.label] ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [f.label]: e.target.value }))}
                  className="w-full rounded-xl border border-line bg-paper px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
              )}
            </div>
          </label>
        ))}
      </div>
      {!leadFormId && (
        <label className="mt-2.5 flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input type="checkbox" checked={saveAnswers} onChange={(e) => setSaveAnswers(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-line accent-cherry cursor-pointer" />
          Save my answers for next time
        </label>
      )}
      <div className="mt-3 flex justify-end">
        <button type="button" onClick={submit} disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-6 py-2.5 text-sm hover:bg-clay disabled:opacity-60 cursor-pointer">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Sending…" : "Send enquiry"}
        </button>
      </div>
    </>
  );
}
