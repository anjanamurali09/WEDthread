import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Check, Loader2, FileText, Plus, Trash2 } from "lucide-react";
import { useOnboardingDraft } from "@/hooks/use-onboarding-draft";
import { VENUE_TYPES, VENUE_SETTINGS } from "@/routes/_authenticated/venues";

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
const RENTALS = [
  "Barware", "Chiavari chairs", "Standard chairs", "China", "Flatware",
  "Glassware", "Lighting", "Linens", "Sound / AV", "Tables", "Tents & marquees",
];
const TRANSPORTATION = [
  "Self parking – free", "Self parking – paid", "Valet parking", "Shuttle service", "Wheelchair accessible",
];
const MENU_OPTIONS = [
  "BYOB available", "Premium open bar", "Beer & wine only", "Plated dinner", "Buffet dinner",
  "Family style", "Cocktail hour", "Dessert station", "Coffee station", "Champagne toast",
];

const EMPTY_SPACE = { name: "", description: "", capacity_seated: "", capacity_standing: "", sqft: "", cost_note: "" };
const EMPTY_PACKAGE = { name: "", guest_count: "", price_min: "", price_max: "", description: "", included: "" };

export function VenueOnboardingForm() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [form, setForm] = useState<any>({
    name: "", country: "", city: "", address: "",
    capacity_seated: "", capacity_standing: "",
    facilities: [] as string[], restrictions: [] as string[],
    price_tier: 3, price_min: "", price_max: "", currency: "AED",
    description: "", long_description: "",
    photos: [] as string[], video_url: "",
    website: "", whatsapp: "", contact_email: "",
    business_license_url: "",
    venue_type: [] as string[], setting: [] as string[],
    rentals_available: [] as string[], transportation: [] as string[], menu_options: [] as string[],
    event_spaces: [] as (typeof EMPTY_SPACE)[],
    packages: [] as (typeof EMPTY_PACKAGE & { included: string })[],
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
        price_min: existing.price_min ?? "",
        price_max: existing.price_max ?? "",
        business_license_url: existing.business_license_url ?? "",
        venue_type: existing.venue_type ?? [],
        setting: existing.setting ?? [],
        rentals_available: existing.rentals_available ?? [],
        transportation: existing.transportation ?? [],
        menu_options: existing.menu_options ?? [],
        event_spaces: (existing.event_spaces as any[]) ?? [],
        packages: ((existing.packages ?? []) as any[]).map((p) => ({ ...p, included: (p.included ?? []).join(", ") })),
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

  const uploadLicense = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingLicense(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const path = `${u.user.id}/license-${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("venue-documents").upload(path, file);
      if (error) { toast.error(error.message); return; }
      const { data: signed } = await supabase.storage.from("venue-documents").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) { set("business_license_url", signed.signedUrl); toast.success("License uploaded."); }
    } finally { setUploadingLicense(false); }
  };

  const submit = async () => {
    if (!form.name || !form.country || !form.city) {
      toast.error("Please fill name, country and city."); return;
    }
    if (!form.business_license_url) {
      toast.error("Upload your business license to submit for review."); return;
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
        price_min: form.price_min ? Number(form.price_min) : null,
        price_max: form.price_max ? Number(form.price_max) : null,
        description: form.description || null, long_description: form.long_description || null,
        photos: form.photos, hero_image: form.photos[0] ?? null,
        video_url: form.video_url || null, website: form.website || null,
        whatsapp: form.whatsapp || null, contact_email: form.contact_email || null,
        business_license_url: form.business_license_url,
        venue_type: form.venue_type, setting: form.setting,
        rentals_available: form.rentals_available, transportation: form.transportation, menu_options: form.menu_options,
        event_spaces: form.event_spaces.filter((s: any) => s.name.trim()),
        packages: form.packages
          .filter((p: any) => p.name.trim())
          .map((p: any) => ({ ...p, included: p.included ? p.included.split(",").map((x: string) => x.trim()).filter(Boolean) : [] })),
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
        <div className="text-sm text-muted-foreground inline-flex items-center gap-1.5">
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
          {status === "approved" ? "Your venue is live." : status === "rejected" ? "Listing needs changes." : "Submitted, waiting for review."}
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

      <Section title="Verification">
        <p className="text-sm text-ink/70 -mt-1">Upload your business license so we can verify your venue before it goes live. Required before you can submit for review.</p>
        <Field label="Business license (PDF or image) *">
          <input type="file" accept="image/*,application/pdf" onChange={(e) => uploadLicense(e.target.files)} className="text-sm" disabled={uploadingLicense} />
          {uploadingLicense && <p className="mt-2 text-sm text-muted-foreground inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
          {form.business_license_url && !uploadingLicense && (
            <p className="mt-2 text-sm text-sage-deep inline-flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" /> License uploaded</p>
          )}
        </Field>
      </Section>

      <Section title="Capacity">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Seated capacity"><input type="number" className="input" value={form.capacity_seated} onChange={(e) => set("capacity_seated", e.target.value)} /></Field>
          <Field label="Standing capacity"><input type="number" className="input" value={form.capacity_standing} onChange={(e) => set("capacity_standing", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Venue type">
        <ChipGrid items={VENUE_TYPES} value={form.venue_type} onToggle={(v) => toggle("venue_type", v)} />
      </Section>

      <Section title="Setting">
        <ChipGrid items={VENUE_SETTINGS} value={form.setting} onToggle={(v) => toggle("setting", v)} />
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
          <Field label="Starting price (off-peak)"><input type="number" className="input" value={form.price_min} onChange={(e) => set("price_min", e.target.value)} /></Field>
          <Field label="Starting price (peak)"><input type="number" className="input" value={form.price_max} onChange={(e) => set("price_max", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Event spaces">
        <p className="text-sm text-ink/70 -mt-1">Add each ceremony or reception space you offer, with its own capacity.</p>
        <RepeatableRows
          rows={form.event_spaces}
          empty={EMPTY_SPACE}
          onChange={(rows) => set("event_spaces", rows)}
          addLabel="Add event space"
          render={(row, update) => (
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Name"><input className="input" value={row.name} onChange={(e) => update({ ...row, name: e.target.value })} /></Field>
              <Field label="Cost"><input className="input" placeholder="Included in venue pricing" value={row.cost_note} onChange={(e) => update({ ...row, cost_note: e.target.value })} /></Field>
              <Field label="Seated capacity"><input type="number" className="input" value={row.capacity_seated} onChange={(e) => update({ ...row, capacity_seated: e.target.value })} /></Field>
              <Field label="Standing capacity"><input type="number" className="input" value={row.capacity_standing} onChange={(e) => update({ ...row, capacity_standing: e.target.value })} /></Field>
              <Field label="Square footage"><input type="number" className="input" value={row.sqft} onChange={(e) => update({ ...row, sqft: e.target.value })} /></Field>
              <Field label="Description"><input className="input" value={row.description} onChange={(e) => update({ ...row, description: e.target.value })} /></Field>
            </div>
          )}
        />
      </Section>

      <Section title="Packages">
        <p className="text-sm text-ink/70 -mt-1">Add pricing packages, with what's included in each.</p>
        <RepeatableRows
          rows={form.packages}
          empty={EMPTY_PACKAGE}
          onChange={(rows) => set("packages", rows)}
          addLabel="Add package"
          render={(row, update) => (
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Package name"><input className="input" value={row.name} onChange={(e) => update({ ...row, name: e.target.value })} /></Field>
              <Field label="Guest count"><input type="number" className="input" value={row.guest_count} onChange={(e) => update({ ...row, guest_count: e.target.value })} /></Field>
              <Field label="Starting price"><input type="number" className="input" value={row.price_min} onChange={(e) => update({ ...row, price_min: e.target.value })} /></Field>
              <Field label="Peak price"><input type="number" className="input" value={row.price_max} onChange={(e) => update({ ...row, price_max: e.target.value })} /></Field>
              <Field label="Description"><input className="input" value={row.description} onChange={(e) => update({ ...row, description: e.target.value })} /></Field>
              <Field label="What's included (comma-separated)"><input className="input" value={row.included} onChange={(e) => update({ ...row, included: e.target.value })} /></Field>
            </div>
          )}
        />
      </Section>

      <Section title="Rentals available">
        <ChipGrid items={RENTALS} value={form.rentals_available} onToggle={(v) => toggle("rentals_available", v)} />
      </Section>

      <Section title="Transportation & access">
        <ChipGrid items={TRANSPORTATION} value={form.transportation} onToggle={(v) => toggle("transportation", v)} />
      </Section>

      <Section title="Menu options">
        <ChipGrid items={MENU_OPTIONS} value={form.menu_options} onToggle={(v) => toggle("menu_options", v)} />
      </Section>

      <Section title="About the venue">
        <Field label="Short tagline"><input className="input" maxLength={140} value={form.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Full description"><textarea className="input resize-none" rows={5} value={form.long_description} onChange={(e) => set("long_description", e.target.value)} /></Field>
      </Section>

      <Section title="Photos & video">
        <Field label={`Photos (${form.photos.length}/15)`}>
          <input type="file" accept="image/*" multiple onChange={(e) => uploadPhotos(e.target.files)} className="text-sm" />
          {form.photos.length > 0 && (
            <div className="mt-3 grid grid-cols-3 md:grid-cols-5 gap-2">
              {form.photos.map((url: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-line group">
                  <img src={url} className="w-full h-full object-cover" alt="" />
                  <button type="button" onClick={() => set("photos", form.photos.filter((_: string, j: number) => j !== i))}
                    className="absolute inset-0 bg-ink/60 text-pearl opacity-0 group-hover:opacity-100 text-sm">Remove</button>
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

function RepeatableRows<T extends Record<string, any>>({ rows, empty, onChange, render, addLabel }: {
  rows: T[]; empty: T; onChange: (rows: T[]) => void; addLabel: string; render: (row: T, update: (row: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {rows.map((row, i) => (
        <div key={i} className="rounded-2xl border border-line p-4 relative">
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))}
            className="absolute top-3 right-3 text-muted-foreground hover:text-wine" aria-label="Remove">
            <Trash2 className="h-4 w-4" />
          </button>
          {render(row, (updated) => onChange(rows.map((r, j) => (j === i ? updated : r))))}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, empty])}
        className="rounded-full border border-line px-4 py-2 text-sm hover:bg-cream inline-flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </button>
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
          : "border-line text-ink hover:bg-cream";
        return <button type="button" key={it} onClick={() => onToggle(it)} className={`text-sm rounded-full px-3 py-1 border ${cls}`}>{it}</button>;
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="paper-card p-5 md:p-6"><h3 className="font-serif text-xl mb-4">{title}</h3><div className="space-y-3">{children}</div></section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-sm uppercase tracking-widest text-muted-foreground">{label}</span><div className="mt-1">{children}</div></label>;
}
