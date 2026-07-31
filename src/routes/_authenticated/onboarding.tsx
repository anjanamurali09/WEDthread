import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentWedding } from "@/lib/wedding-hooks";
import { useOnboardingDraft } from "@/hooks/use-onboarding-draft";
import { toast } from "sonner";
import { Sparkles, ArrowRight, Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({ component: Onboarding });

function slugify(a: string, b: string) {
  const base = `${a}-and-${b}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

function Onboarding() {
  const navigate = useNavigate();
  const { data: wedding, isLoading } = useCurrentWedding();
  const [form, setForm] = useState({
    partner_a: "", partner_b: "",
    destination_city: "", destination_country: "",
    est_guest_count: 100,
  });
  const [saving, setSaving] = useState(false);
  const { hydrated, initial, saving: autoSaving, savedAt, markCompleted } =
    useOnboardingDraft<typeof form>("couple", form, { enabled: !wedding });

  // Rehydrate form from any saved draft the first time it loads.
  useEffect(() => {
    if (hydrated && initial && Object.keys(initial).length > 0) {
      setForm((f) => ({ ...f, ...initial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  useEffect(() => {
    if (wedding) navigate({ to: "/dashboard", replace: true });
  }, [wedding, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const slug = slugify(form.partner_a || "wedding", form.partner_b || "vowzy");
      const { error } = await supabase.from("weddings").insert({
        owner_id: u.user.id,
        partner_a: form.partner_a,
        partner_b: form.partner_b,
        destination_city: form.destination_city || null,
        destination_country: form.destination_country || null,
        est_guest_count: Number(form.est_guest_count) || null,
        slug,
      });
      if (error) throw error;
      await markCompleted();
      toast.success("Wedding created. Let's add your events.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally { setSaving(false); }
  };

  // Stay on the loading screen while the wedding lookup is in flight AND
  // while a redirect to /dashboard is queued (wedding present). Rendering the
  // form only when we're sure there's nothing to redirect to avoids the
  // "empty form flashes for a second" glitch on returning sign-ins.
  if (isLoading || wedding || !hydrated) {
    return <div className="min-h-screen grid place-items-center bg-pearl"><p className="text-muted-foreground text-sm">Loading your wedding…</p></div>;
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full">
        <div className="flex items-center gap-2 mb-8">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-clay text-paper"><Sparkles className="h-4 w-4" /></span>
          <span className="font-serif text-2xl">Vowzy</span>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-clay">Start your wedding</p>
        <h1 className="mt-3 font-serif text-4xl md:text-5xl">Tell us who's getting married, and where.</h1>
        <p className="mt-3 text-muted-foreground">You can change everything later. This is just so the app knows what to call the wedding.</p>

        <form onSubmit={submit} className="mt-10 grid gap-5">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Partner A" value={form.partner_a} onChange={(v) => setForm({ ...form, partner_a: v })} required placeholder="e.g. Ananya" />
            <Field label="Partner B" value={form.partner_b} onChange={(v) => setForm({ ...form, partner_b: v })} required placeholder="e.g. James" />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Destination city" value={form.destination_city} onChange={(v) => setForm({ ...form, destination_city: v })} placeholder="e.g. Udaipur, Lisbon, Cancún" />
            <Field label="Destination country" value={form.destination_country} onChange={(v) => setForm({ ...form, destination_country: v })} placeholder="e.g. India, Portugal, Mexico" />
          </div>
          <Field label="Estimated guest count" type="number" value={String(form.est_guest_count)} onChange={(v) => setForm({ ...form, est_guest_count: Number(v) || 0 })} />

          <div className="flex items-center gap-4 mt-4">
            <button disabled={saving} className="inline-flex justify-center items-center gap-2 rounded-full bg-ink text-paper px-8 py-3.5 text-sm font-medium hover:bg-clay disabled:opacity-60">
              {saving ? "Creating…" : (<>Continue <ArrowRight className="h-4 w-4" /></>)}
            </button>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              {autoSaving ? (<><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>)
                : savedAt ? (<><Check className="h-3 w-3 text-clay" /> Draft saved</>)
                : "Autosaves as you type"}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}{required && <span className="text-cherry ml-0.5">*</span>}</span>
      <input type={type} required={required} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
    </label>
  );
}
