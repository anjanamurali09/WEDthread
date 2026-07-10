import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Check, Loader2 } from "lucide-react";
import { useOnboardingDraft } from "@/hooks/use-onboarding-draft";

const CURRENCIES = ["AED", "USD", "INR", "GBP", "EUR", "SAR", "PKR", "SGD", "LKR", "BDT", "AUD", "CAD"];
const PRICE_TIERS = [1, 2, 3, 4, 5];

const FACILITIES = [
  "Parking", "In-house catering", "Alcohol licence", "On-site accommodation",
  "Bridal suite", "AV & sound", "Outdoor ceremony space", "Pool", "Beachfront",
  "Garden", "Ballroom", "Rooftop", "Air conditioning", "Wheelchair access",
];
const RESTRICTIONS = [
  "No outside catering", "No alcohol", "No open flames", "Noise curfew",
  "No confetti", "Vegetarian-only kitchen", "Halal-only kitchen", "Kosher-only kitchen",
];

export function VenueOnboardingForm() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", country: "", city: "", address: "",
    capacity_seated: "", capacity_standing: "",
    facilities: [] as string[], restrictions: [] as string[],
    price_tier: 3, currency: "AED",
    description: "", long_description: "",
    photos: [] as string[], video_url: "",
    website: "", whatsapp: "", contact_email: "",
  });

  const { data: existing } = useQuery({
    queryKey: ["my-venue"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("venues").select("*").eq("owner_id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { hydrated: draftHydrated, initial: draftInitial, saving: autoSaving, savedAt, markCompleted } =
    useOnboardingDraft<any>("venue", form, { enabled: !existing });

  useEffect(() => {
    if (existing) {
      setForm((f: any) => ({
        ...f, ...existing,
        facilities: existing.facilities ?? [],
        restrictions: existing.restrictions ?? [],
        photos: existing.photos ?? [],
        capacity_seated: existing.capacity_seated ?? "",
        capacity_standing: existing.capacity_standing ?? "",
      }));
    } else if (draftHydrated && draftInitial && Object.keys(draftInitial).length > 0) {
      setForm((f: any) => ({ ...f, ...draftInitial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, draftHydrated]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const toggle = (k: string, v: string) => set(k, form[k].includes(v) ? form[k].filter((x: string) => x !== v) : [...form[k], v]);

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 15)) {
      const path = `${u.user.id}/venue-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("wedding-assets").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data: signed } = await supabase.storage.from("wedding-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) uploaded.push(signed.signedUrl);
    }
    set("photos", [...form.photos, ...uploaded].slice(0, 15));
  };

  const submit = async () => {
    if (!form.name || !form.country || !form.city) {
      toast.error("Please fill name, country and city."); return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in first");
      const payload: any = {
        owner_id: u.user.id,
        name: form.name, country: form.country, city: form.city, address: form.address || null,
        capacity: form.capacity_seated ? Number(form.capacity_seated) : null,
        capacity_seated: form.capacity_seated ? Number(form.capacity_seated) : null,
        capacity_standing: form.capacity_standing ? Number(form.capacity_standing) : null,
        facilities: form.facilities, restrictions: form.restrictions,
        price_tier: form.price_tier, currency: form.currency,
        description: form.description || null, long_description: form.long_description || null,
        photos: form.photos, hero_image: form.photos[0] ?? null,
        video_url: form.video_url || null, website: form.website || null,
        whatsapp: form.whatsapp || null, contact_email: form.contact_email || null,
      };
      if (existing) {
        const { error } = await supabase.from("venues").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("venues").insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["my-venue"] });
      await markCompleted();
      toast.success("Saved. Awaiting review.");
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const status = existing?.status ?? null;

  return (
    <div className="space-y-6 max-w-3xl">
      {!existing && (
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          {autoSaving ? (<><Loader2 className="h-3 w-3 animate-spin" /> Saving draft…</>)
            : savedAt ? (<><Check className="h-3 w-3 text-clay" /> Draft saved</>)
            : "Autosaves as you type"}
        </div>
      )}
      {status && (
        <div className={`rounded-2xl px-4 py-3 text-sm inline-flex items-center gap-2 ${
          status === "approved" ? "bg-sage-soft text-ink" : status === "rejected" ? "bg-wine-soft text-wine" : "bg-blush-soft text-cherry"
        }`}>
          <CheckCircle2 className="h-4 w-4" />
          {status === "approved" ? "Your venue is live." : status === "rejected" ? "Listing needs changes." : "Submitted — waiting for review."}
        </div>
      )}

      <Section title="Venue basics">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Venue name *"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Country *"><input className="input" value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
          <Field label="City *"><input className="input" value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Address"><input className="input" value={form.address} onChange={(e) => set("address", e.target.value)} /></Field>
          <Field label="Website"><input className="input" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
          <Field label="WhatsApp"><input className="input" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+971 …" /></Field>
          <Field label="Contact email"><input type="email" className="input" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Capacity">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Seated capacity"><input type="number" className="input" value={form.capacity_seated} onChange={(e) => set("capacity_seated", e.target.value)} /></Field>
          <Field label="Standing capacity"><input type="number" className="input" value={form.capacity_standing} onChange={(e) => set("capacity_standing", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Facilities">
        <ChipGrid items={FACILITIES} value={form.facilities} onToggle={(v) => toggle("facilities", v)} />
      </Section>

      <Section title="Restrictions">
        <ChipGrid items={RESTRICTIONS} value={form.restrictions} onToggle={(v) => toggle("restrictions", v)} tone="wine" />
      </Section>

      <Section title="Pricing">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Price tier">
            <div className="flex gap-1">
              {PRICE_TIERS.map((t) => (
                <button type="button" key={t} onClick={() => set("price_tier", t)}
                  className={`flex-1 rounded-full py-2 text-sm border transition-colors ${form.price_tier === t ? "bg-cherry text-pearl border-cherry" : "border-line hover:bg-cream"}`}>
                  {"$".repeat(t)}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Currency">
            <select className="input" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="About the venue">
        <Field label="Short tagline"><input className="input" maxLength={140} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Full description"><textarea className="input resize-none" rows={5} value={form.long_description} onChange={(e) => set("long_description", e.target.value)} /></Field>
      </Section>

      <Section title="Photos & video">
        <Field label={`Photos (${form.photos.length}/15)`}>
          <input type="file" accept="image/*" multiple onChange={(e) => uploadPhotos(e.target.files)} className="text-xs" />
          {form.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
              {form.photos.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-line group">
                  <img src={url} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => set("photos", form.photos.filter((_: string, j: number) => j !== i))}
                    className="absolute inset-0 bg-ink/60 text-pearl opacity-0 group-hover:opacity-100 text-xs">Remove</button>
                </div>
              ))}
            </div>
          )}
        </Field>
        <Field label="Video URL"><input className="input" value={form.video_url} onChange={(e) => set("video_url", e.target.value)} /></Field>
      </Section>

      <button onClick={submit} disabled={saving} className="rounded-full bg-cherry text-pearl px-6 py-2.5 text-sm hover:bg-wine transition-colors inline-flex items-center gap-2">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} {existing ? "Save changes" : "Save & submit for review"}
      </button>

      <style>{`.input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:0.75rem;padding:0.55rem 0.75rem;font-size:0.875rem}.input:focus{outline:none;border-color:var(--cherry);box-shadow:0 0 0 3px color-mix(in oklab,var(--cherry),transparent 80%)}`}</style>
    </div>
  );
}

function ChipGrid({ items, value, onToggle, tone = "cherry" }: { items: string[]; value: string[]; onToggle: (v: string) => void; tone?: "cherry" | "wine" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => {
        const on = value.includes(it);
        const cls = on
          ? tone === "wine" ? "bg-wine text-pearl border-wine" : "bg-cherry text-pearl border-cherry"
          : "border-line text-ink/70 hover:bg-cream";
        return <button type="button" key={it} onClick={() => onToggle(it)} className={`text-xs rounded-full px-3 py-1 border ${cls}`}>{it}</button>;
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="paper-card p-5 md:p-6"><h3 className="font-serif text-xl mb-4">{title}</h3><div className="space-y-3">{children}</div></section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>;
}
