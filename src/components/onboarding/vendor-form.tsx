import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Check, Loader2 } from "lucide-react";
import { useOnboardingDraft } from "@/hooks/use-onboarding-draft";

const CURRENCIES = ["AED", "USD", "INR", "GBP", "EUR", "SAR", "PKR", "SGD", "LKR", "BDT", "AUD", "CAD"];
const PRICE_TIERS = [1, 2, 3, 4, 5];

type Cat = { id: string; name: string; parent_id: string | null; sort_order: number };

export function VendorOnboardingForm() {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<any>({
    business_name: "",
    contact_name: "",
    contact_email: "",
    whatsapp: "",
    home_country: "",
    home_city: "",
    category_id: "",
    subcategory_ids: [] as string[],
    description: "",
    long_description: "",
    price_tier: 3,
    currency: "AED",
    photos: [] as string[],
    video_url: "",
    website: "",
    instagram: "",
    years_in_business: "",
    countries_served: [] as string[],
  });

  const { data: existing } = useQuery({
    queryKey: ["my-vendor"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("vendors").select("*").eq("owner_id", u.user.id).maybeSingle();
      return data;
    },
  });

  const { data: cats = [] } = useQuery({
    queryKey: ["vendor-categories"],
    queryFn: async () => (await supabase.from("vendor_categories").select("id,name,parent_id,sort_order").order("sort_order").order("name")).data as Cat[] ?? [],
  });

  const tier1 = useMemo(() => cats.filter((c) => c.parent_id === null), [cats]);
  const tier2 = useMemo(() => cats.filter((c) => c.parent_id === form.category_id), [cats, form.category_id]);

  const { hydrated: draftHydrated, initial: draftInitial, saving: autoSaving, savedAt, markCompleted } =
    useOnboardingDraft<any>("vendor", form, { enabled: !existing });

  useEffect(() => {
    if (existing) {
      setForm((f: any) => ({
        ...f,
        ...existing,
        subcategory_ids: existing.subcategory_ids ?? [],
        photos: existing.photos ?? [],
        countries_served: existing.countries_served ?? [],
        years_in_business: existing.years_in_business ?? "",
      }));
    } else if (draftHydrated && draftInitial && Object.keys(draftInitial).length > 0) {
      setForm((f: any) => ({ ...f, ...draftInitial }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, draftHydrated]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const submit = async (publish = false) => {
    if (!form.business_name || !form.home_country || !form.category_id) {
      toast.error("Please fill business name, country and category.");
      return;
    }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sign in first");
      const payload: any = {
        owner_id: u.user.id,
        business_name: form.business_name,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        whatsapp: form.whatsapp || null,
        home_country: form.home_country,
        home_city: form.home_city || null,
        category_id: form.category_id,
        subcategory_ids: form.subcategory_ids,
        description: form.description || null,
        long_description: form.long_description || null,
        price_tier: form.price_tier,
        currency: form.currency,
        photos: form.photos,
        hero_image: form.photos[0] ?? null,
        video_url: form.video_url || null,
        website: form.website || null,
        instagram: form.instagram || null,
        years_in_business: form.years_in_business ? Number(form.years_in_business) : null,
        countries_served: form.countries_served,
      };
      if (existing) {
        const { error } = await supabase.from("vendors").update(payload).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vendors").insert(payload);
        if (error) throw error;
      }
      qc.invalidateQueries({ queryKey: ["my-vendor"] });
      await markCompleted();
      toast.success(publish ? "Submitted for review." : "Saved.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const uploadPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, 10)) {
      const path = `${u.user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("wedding-assets").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data: signed } = await supabase.storage.from("wedding-assets").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) uploaded.push(signed.signedUrl);
    }
    set("photos", [...form.photos, ...uploaded].slice(0, 10));
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
          {status === "approved" ? "Your listing is live." : status === "rejected" ? "Listing needs changes — see notes." : "Submitted — waiting for review."}
        </div>
      )}

      <Section title="Business">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Business name *"><input className="input" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} /></Field>
          <Field label="Contact name"><input className="input" value={form.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></Field>
          <Field label="Email"><input type="email" className="input" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></Field>
          <Field label="WhatsApp (with country code)"><input className="input" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+971 …" /></Field>
          <Field label="Website"><input className="input" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></Field>
          <Field label="Instagram"><input className="input" value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="@handle" /></Field>
        </div>
      </Section>

      <Section title="Location & service area">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Home country *"><input className="input" value={form.home_country} onChange={(e) => set("home_country", e.target.value)} placeholder="UAE, India, UK…" /></Field>
          <Field label="Home city"><input className="input" value={form.home_city} onChange={(e) => set("home_city", e.target.value)} /></Field>
          <Field label="Countries served (comma separated)">
            <input className="input" value={form.countries_served.join(", ")} onChange={(e) => set("countries_served", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </Field>
          <Field label="Years in business"><input type="number" className="input" value={form.years_in_business} onChange={(e) => set("years_in_business", e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Category">
        <Field label="Tier 1 category *">
          <select className="input" value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
            <option value="">Pick a category…</option>
            {tier1.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {tier2.length > 0 && (
          <Field label="Subcategories">
            <div className="flex flex-wrap gap-1.5">
              {tier2.map((c) => {
                const on = form.subcategory_ids.includes(c.id);
                return (
                  <button
                    type="button" key={c.id}
                    onClick={() => set("subcategory_ids", on ? form.subcategory_ids.filter((x: string) => x !== c.id) : [...form.subcategory_ids, c.id])}
                    className={`text-xs rounded-full px-3 py-1 border ${on ? "bg-cherry text-pearl border-cherry" : "border-line text-ink/70 hover:bg-cream"}`}>
                    {c.name}
                  </button>
                );
              })}
            </div>
          </Field>
        )}
      </Section>

      <Section title="About your services">
        <Field label="Short tagline"><input className="input" value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={140} /></Field>
        <Field label="Full description"><textarea className="input resize-none" rows={5} value={form.long_description} onChange={(e) => set("long_description", e.target.value)} /></Field>
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

      <Section title="Photos & video">
        <Field label={`Photos (${form.photos.length}/10)`}>
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
        <Field label="Video URL (YouTube / Vimeo)"><input className="input" value={form.video_url} onChange={(e) => set("video_url", e.target.value)} /></Field>
      </Section>

      <div className="flex gap-3">
        <button onClick={() => submit(false)} disabled={saving}
          className="rounded-full bg-cherry text-pearl px-6 py-2.5 text-sm hover:bg-wine transition-colors inline-flex items-center gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {existing ? "Save changes" : "Save & submit for review"}
        </button>
      </div>

      <style>{`.input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:0.75rem;padding:0.55rem 0.75rem;font-size:0.875rem}.input:focus{outline:none;border-color:var(--cherry);box-shadow:0 0 0 3px color-mix(in oklab,var(--cherry),transparent 80%)}`}</style>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="paper-card p-5 md:p-6">
      <h3 className="font-serif text-xl mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
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
