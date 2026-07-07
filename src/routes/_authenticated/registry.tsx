import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding } from "@/lib/wedding-hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2, Globe2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/registry")({ component: RegistryPage });

const COUNTRY_SITES: Record<string, { name: string; url: string }[]> = {
  US: [{ name: "Amazon", url: "https://amazon.com" }, { name: "Crate & Barrel", url: "https://crateandbarrel.com" }, { name: "West Elm", url: "https://westelm.com" }, { name: "Williams-Sonoma", url: "https://williams-sonoma.com" }],
  UK: [{ name: "John Lewis", url: "https://johnlewis.com" }, { name: "Selfridges", url: "https://selfridges.com" }, { name: "Amazon UK", url: "https://amazon.co.uk" }],
  IN: [{ name: "Amazon India", url: "https://amazon.in" }, { name: "Fabindia", url: "https://fabindia.com" }, { name: "Nicobar", url: "https://nicobar.com" }, { name: "Good Earth", url: "https://goodearth.in" }],
  AE: [{ name: "Amazon.ae", url: "https://amazon.ae" }, { name: "Bloomingdale's UAE", url: "https://bloomingdales.ae" }, { name: "West Elm UAE", url: "https://westelm.ae" }],
  AU: [{ name: "David Jones", url: "https://davidjones.com" }, { name: "Myer", url: "https://myer.com.au" }, { name: "Amazon AU", url: "https://amazon.com.au" }],
  CA: [{ name: "Hudson's Bay", url: "https://thebay.com" }, { name: "Amazon.ca", url: "https://amazon.ca" }, { name: "Indigo", url: "https://indigo.ca" }],
};

const COUNTRIES = [
  ["US", "United States"], ["UK", "United Kingdom"], ["IN", "India"],
  ["AE", "UAE"], ["AU", "Australia"], ["CA", "Canada"],
] as const;

const CURRENCY: Record<string, { code: string; symbol: string; locale: string }> = {
  US: { code: "USD", symbol: "$",   locale: "en-US" },
  UK: { code: "GBP", symbol: "£",   locale: "en-GB" },
  IN: { code: "INR", symbol: "₹",   locale: "en-IN" },
  AE: { code: "AED", symbol: "AED", locale: "en-AE" },
  AU: { code: "AUD", symbol: "A$",  locale: "en-AU" },
  CA: { code: "CAD", symbol: "C$",  locale: "en-CA" },
};

// Appends Vowzy UTM tracking params to any outbound registry link so we can
// attribute referral traffic back to the platform.
function withUtm(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("utm_source", "vowzy");
    u.searchParams.set("utm_medium", "referral");
    u.searchParams.set("utm_campaign", "registry");
    return u.toString();
  } catch {
    // Not a valid absolute URL — return untouched so validation happens elsewhere.
    return rawUrl;
  }
}

function formatPrice(cents: number, countryCode: string) {
  const c = CURRENCY[countryCode] ?? CURRENCY.US;
  try {
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.code, maximumFractionDigits: 2 }).format(cents / 100);
  } catch {
    return `${c.symbol} ${(cents / 100).toFixed(2)}`;
  }
}

function RegistryPage() {
  const { data: wedding } = useCurrentWedding();
  const qc = useQueryClient();

  const { data: registry } = useQuery({
    queryKey: ["registry", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("registries").select("*").eq("wedding_id", wedding!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createRegistry = useMutation({
    mutationFn: async (country: string) => {
      const { data, error } = await supabase.from("registries").insert({ wedding_id: wedding!.id, country_code: country, is_public: true }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["registry", wedding?.id] }); toast.success("Registry created"); },
    onError: (e: any) => toast.error(e.message),
  });

  const { data: items = [] } = useQuery({
    queryKey: ["registry-items", registry?.id],
    enabled: !!registry?.id,
    queryFn: async () => (await supabase.from("registry_items").select("*").eq("registry_id", registry!.id).order("sort_order")).data ?? [],
  });

  const setCountry = useMutation({
    mutationFn: async (country: string) => {
      const { error } = await supabase.from("registries").update({ country_code: country }).eq("id", registry!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", wedding?.id] }),
  });

  const [form, setForm] = useState({ title: "", product_url: "", price: "", retailer: "" });

  const addItem = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("registry_items").insert({
        registry_id: registry!.id,
        title: form.title.trim(),
        product_url: form.product_url ? withUtm(form.product_url) : null,
        retailer: form.retailer || null,
        price_cents: form.price ? Math.round(parseFloat(form.price) * 100) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] }); setForm({ title: "", product_url: "", price: "", retailer: "" }); toast.success("Added"); },
    onError: (e: any) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("registry_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] }),
  });

  if (!wedding) {
    return <AppShell title="Registry"><p className="text-sm text-muted-foreground">Finish onboarding first to create a registry.</p></AppShell>;
  }

  if (!registry) {
    return (
      <AppShell title="Registry" subtitle="Curate a gift list from retailers in your country. One link, shared with guests.">
        <div className="paper-card p-8 max-w-2xl">
          <h2 className="font-serif text-2xl">Where do most of your guests shop?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Pick your country to see suggested retailers. You can change this later.</p>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {COUNTRIES.map(([code, name]) => (
              <button key={code} onClick={() => createRegistry.mutate(code)} disabled={createRegistry.isPending} className="rounded-2xl border border-line p-4 text-left hover:border-wine disabled:opacity-60">
                <p className="font-serif text-lg">{name}</p>
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{code}</p>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const sites = COUNTRY_SITES[registry.country_code ?? "US"] ?? [];

  return (
    <AppShell title="Registry" subtitle="Add items from any retailer. Guests browse and reserve from your wedding site.">
      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="paper-card p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-cherry">Country</p>
                <select value={registry.country_code ?? "US"} onChange={(e) => setCountry.mutate(e.target.value)} className="mt-1 rounded-full border border-line bg-pearl px-4 py-2 text-sm">
                  {COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                </select>
              </div>
              <div className="text-xs text-muted-foreground">
                {items.length} item{items.length === 1 ? "" : "s"}
              </div>
            </div>

            {sites.length > 0 && (
              <>
                <p className="mt-6 text-[11px] uppercase tracking-widest text-muted-foreground">Popular retailers</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {sites.map((s) => (
                    <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs hover:border-wine">
                      <Globe2 className="h-3 w-3" /> {s.name} <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-line p-12 text-center">
                <p className="font-serif text-xl">No items yet</p>
                <p className="text-sm text-muted-foreground mt-1">Add your first gift on the right.</p>
              </div>
            ) : items.map((it: any) => (
              <div key={it.id} className="paper-card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-lg truncate">{it.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {it.retailer && <>{it.retailer} · </>}
                    {it.price_cents && <>{formatPrice(it.price_cents, registry.country_code ?? "US")} · </>}
                    {it.product_url && <a href={it.product_url} target="_blank" rel="noreferrer" className="hover:text-cherry underline underline-offset-2">view</a>}
                  </p>
                </div>
                <button onClick={() => removeItem.mutate(it.id)} className="text-muted-foreground hover:text-cherry"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </section>

        <aside className="paper-card p-6 h-fit lg:sticky lg:top-6">
          <h3 className="font-serif text-xl">Add item</h3>
          <div className="mt-4 space-y-3">
            <input placeholder="Title (e.g. Le Creuset dutch oven)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            <input placeholder="Product URL" value={form.product_url} onChange={(e) => setForm({ ...form, product_url: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
            <p className="text-[10px] text-muted-foreground -mt-1 px-1">We'll auto-add Vowzy referral tags (utm_source=vowzy) so partners can credit sales back to you.</p>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Retailer" value={form.retailer} onChange={(e) => setForm({ ...form, retailer: e.target.value })} className="rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{(CURRENCY[registry.country_code ?? "US"] ?? CURRENCY.US).symbol}</span>
                <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl pl-10 pr-3 py-2.5 text-sm" />
              </div>
            </div>
            <button onClick={() => addItem.mutate()} disabled={addItem.isPending} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-wine text-pearl py-2.5 text-sm hover:bg-cherry disabled:opacity-60">
              <Plus className="h-4 w-4" /> Add to registry
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
