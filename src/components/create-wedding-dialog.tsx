import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";

function slugify(a: string, b: string) {
  const base = `${a}-and-${b}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

const FIELD = "mt-1 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-clay";
const LABEL = "text-sm uppercase tracking-widest text-muted-foreground";

// Shown over the page the first time a couple signs in and has no wedding yet. It cannot be dismissed:
// the rest of the app needs a wedding to exist. Creating it lifts the popup and reveals the dashboard.
export function CreateWeddingDialog() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ partner_a: "", partner_b: "", destination_city: "", destination_country: "", est_guest_count: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("You're signed out. Please sign in again.");
      const { error: err } = await supabase.from("weddings").insert({
        owner_id: u.user.id,
        partner_a: form.partner_a.trim(),
        partner_b: form.partner_b.trim(),
        destination_city: form.destination_city.trim() || null,
        destination_country: form.destination_country.trim() || null,
        est_guest_count: form.est_guest_count.trim() ? Number(form.est_guest_count) : null,
        slug: slugify(form.partner_a.trim() || "wedding", form.partner_b.trim() || "wedthread"),
      });
      // 23505: a wedding already exists for this person (another tab, or a moment ago). Just load it.
      if (err && err.code !== "23505") throw err;
      await qc.invalidateQueries({ queryKey: ["current-wedding"] });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-ink/50 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="create-wedding-title" className="my-8 w-full max-w-lg rounded-3xl border border-line bg-paper p-8 shadow-2xl">
        <Logo sizeClassName="text-2xl" />
        <h2 id="create-wedding-title" className="mt-6 font-serif text-3xl leading-tight">Tell us about your wedding</h2>
        <p className="mt-2 text-sm text-muted-foreground">A few details to get started. You can change any of them later.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className={LABEL}>Partner A <span className="text-cherry">*</span></span>
              <input required autoFocus value={form.partner_a} onChange={(e) => set("partner_a", e.target.value)} className={FIELD} /></label>
            <label className="block"><span className={LABEL}>Partner B <span className="text-cherry">*</span></span>
              <input required value={form.partner_b} onChange={(e) => set("partner_b", e.target.value)} className={FIELD} /></label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className={LABEL}>Destination city</span>
              <input value={form.destination_city} onChange={(e) => set("destination_city", e.target.value)} className={FIELD} /></label>
            <label className="block"><span className={LABEL}>Destination country</span>
              <input value={form.destination_country} onChange={(e) => set("destination_country", e.target.value)} className={FIELD} /></label>
          </div>
          <label className="block"><span className={LABEL}>Estimated guest count</span>
            <input type="number" min={0} inputMode="numeric" value={form.est_guest_count} onChange={(e) => set("est_guest_count", e.target.value)} className={FIELD} /></label>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <button disabled={saving || !form.partner_a.trim() || !form.partner_b.trim()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-8 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-clay disabled:opacity-60">
            {saving ? "Creating…" : (<>Continue <ArrowRight className="h-4 w-4" /></>)}
          </button>
        </form>
      </div>
    </div>
  );
}
