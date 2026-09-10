import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useCurrentWedding } from "@/lib/wedding-hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2, Globe2, Share2, Copy, Check, MessageCircle, X, Star, Eye, Loader2, ChevronDown } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { Dropdown } from "@/components/dropdown";
import { CURRENCIES, formatMoney, type CurrencyCode } from "@/lib/currency";
import { RetailerFallback } from "@/components/retailer-fallback";

export const Route = createFileRoute("/_authenticated/registry")({ component: RegistryPage });

type ProductMetadata = { success: true; name: string | null; image: string | null; price: number | null } | { success: false };

async function fetchProductMetadata(url: string): Promise<ProductMetadata> {
  const { data, error } = await supabase.functions.invoke<ProductMetadata>("fetch-product-metadata", { body: { url } });
  if (error || !data) return { success: false };
  return data;
}

const COUNTRIES = [
  ["US", "United States"], ["UK", "United Kingdom"], ["IN", "India"],
  ["AE", "UAE"], ["AU", "Australia"], ["CA", "Canada"],
] as const;

// Currency dropdown order: local currency first, then by relevance to that country's
// couples, not alphabetical. Also doubles as the default currency (first entry) for
// registries created before the selector existed (registries.currency_code is null).
const CURRENCY_ORDER_BY_COUNTRY: Record<string, CurrencyCode[]> = {
  AE: ["AED", "INR", "GBP", "USD", "AUD", "CAD"],
  IN: ["INR", "AED", "GBP", "USD", "AUD", "CAD"],
  UK: ["GBP", "INR", "AED", "USD", "AUD", "CAD"],
  US: ["USD", "INR", "GBP", "AED", "AUD", "CAD"],
  AU: ["AUD", "INR", "GBP", "AED", "USD", "CAD"],
  CA: ["CAD", "INR", "GBP", "AED", "USD", "AUD"],
};

function withUtm(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("utm_source", "wedthread");
    u.searchParams.set("utm_medium", "referral");
    u.searchParams.set("utm_campaign", "registry");
    return u.toString();
  } catch { return rawUrl; }
}

function RegistryPage() {
  const { data: wedding, isLoading: weddingLoading } = useCurrentWedding();
  const qc = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);

  const { data: registry, isLoading: registryLoading } = useQuery({
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

  const { data: items = [], isLoading: itemsLoading } = useQuery({
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

  const setCurrency = useMutation({
    mutationFn: async (currency: string) => {
      const { error } = await supabase.from("registries").update({ currency_code: currency }).eq("id", registry!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry", wedding?.id] }),
  });

  const { data: affiliatePartners = [] } = useQuery({
    queryKey: ["affiliate-partners", registry?.country_code],
    enabled: !!registry?.country_code,
    queryFn: async () => (await supabase.from("affiliate_partners").select("*")
      .eq("status", "approved").eq("country", registry!.country_code!)).data ?? [],
  });

  const [form, setForm] = useState({ title: "", product_url: "", price: "", retailer: "", image_url: "", is_most_wanted: false });
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [autoFillFailed, setAutoFillFailed] = useState(false);

  const onUrlBlur = async () => {
    const raw = form.product_url.trim();
    const looksLikeUrl = /^https?:\/\//i.test(raw) || /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|$)/i.test(raw);
    if (!raw || !looksLikeUrl) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    setFetchingDetails(true);
    setAutoFillFailed(false);
    try {
      const result = await fetchProductMetadata(url);
      if (result.success) {
        setForm((f) => ({
          ...f,
          title: f.title || result.name || "",
          image_url: f.image_url || result.image || "",
          price: f.price || (result.price != null ? String(result.price) : ""),
        }));
        setAutoFillFailed(false);
      } else {
        setAutoFillFailed(true);
      }
    } catch {
      setAutoFillFailed(true);
    } finally {
      setFetchingDetails(false);
    }
  };

  const addItem = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title required");
      const { error } = await supabase.from("registry_items").insert({
        registry_id: registry!.id,
        title: form.title.trim(),
        product_url: form.product_url ? withUtm(form.product_url) : null,
        retailer: form.retailer || null,
        image_url: form.image_url || null,
        price_cents: form.price ? Math.round(parseFloat(form.price) * 100) : null,
        is_most_wanted: form.is_most_wanted,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] });
      setForm({ title: "", product_url: "", price: "", retailer: "", image_url: "", is_most_wanted: false });
      setAutoFillFailed(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("registry_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] }),
  });

  const toggleMostWanted = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: boolean }) => {
      const { error } = await supabase.from("registry_items").update({ is_most_wanted: next }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] }),
    onError: (e: any) => toast.error(e.message),
  });

  if (weddingLoading || registryLoading) {
    return <AppShell title="Registry"><p className="text-sm text-muted-foreground">Loading…</p></AppShell>;
  }

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
                <p className="font-sans text-lg font-semibold">{name}</p>
                <p className="text-sm uppercase tracking-widest text-muted-foreground">{code}</p>
              </button>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/w/${wedding.slug}/registry` : "";
  const countryOptions = COUNTRIES.map(([code, name]) => ({ value: code, label: name }));
  const currencyOrder = CURRENCY_ORDER_BY_COUNTRY[registry.country_code ?? "US"] ?? CURRENCY_ORDER_BY_COUNTRY.US;
  const currencyOptions = currencyOrder.map((code) => ({ value: code, label: `${code} — ${CURRENCIES[code].label}` }));
  const currencyCode: CurrencyCode = (registry.currency_code as CurrencyCode) || currencyOrder[0];

  return (
    <AppShell title="Registry" subtitle="Add gifts and share one link with your guests."
      actions={
        <RegistryLocaleButton
          country={registry.country_code ?? "US"} currency={currencyCode}
          countryOptions={countryOptions} currencyOptions={currencyOptions}
          onCountryChange={(v) => setCountry.mutate(v)} onCurrencyChange={(v) => setCurrency.mutate(v)}
        />
      }>
      {/* Share bar */}
      <div className="paper-card p-4 md:p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-widest text-cherry">Your registry link</p>
          <p className="mt-1 font-mono text-sm md:text-sm truncate">{shareUrl || `…/w/${wedding.slug}/registry`}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-paper px-5 py-2.5 text-sm hover:bg-stone transition-colors">
            <Eye className="h-4 w-4" /> Preview
          </a>
          <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-sage-deep text-pearl px-5 py-2.5 text-sm hover:bg-sage-deep-hover transition-colors">
            <Share2 className="h-4 w-4" /> Share
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {affiliatePartners.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm uppercase tracking-widest text-muted-foreground shrink-0">Popular retailers</p>
                {affiliatePartners.map((p: any) => (
                  <a key={p.id} href={p.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-sm hover:border-wine">
                    <Globe2 className="h-3 w-3" /> {p.business_name} <ExternalLink className="h-3 w-3 opacity-50" />
                  </a>
                ))}
              </div>
            ) : <div />}
            <p className="text-sm text-muted-foreground shrink-0">{formatNumber(items.length)} item{items.length === 1 ? "" : "s"}</p>
          </div>

          {itemsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <section className="warm-wash rounded-[40px] border border-line/60 px-6 md:px-12 py-10 text-center max-w-2xl mx-auto">
              <p className="text-sm uppercase tracking-[0.3em] text-cherry">Your registry</p>
              <h3 className="mt-2 font-serif text-3xl md:text-4xl leading-tight">A few things you've been dreaming of</h3>
              <p className="mt-3 text-sm text-ink leading-relaxed">Add a product link, name, and price on the right — whatever you're hoping for.</p>
            </section>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {items.map((it: any) => (
                <div key={it.id} className={cn(
                  "paper-card overflow-hidden group relative flex flex-col",
                  it.is_most_wanted && "ring-2 ring-rose-deep",
                )}>
                  {it.is_most_wanted && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-rose-deep text-pearl px-2 py-0.5 text-[8px] font-medium uppercase tracking-wide">
                      <Star className="h-2.5 w-2.5 fill-current" /> Most wanted
                    </span>
                  )}
                  <div className="aspect-square bg-pearl border-b border-line overflow-hidden">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <RetailerFallback productUrl={it.product_url} retailer={it.retailer}
                        iconClassName="h-10 w-10" textClassName="text-xs" />
                    )}
                  </div>
                  <div className="px-3 pt-2 pb-3 flex-1 flex flex-col gap-1">
                    {it.retailer && <p className="text-xs uppercase tracking-widest text-muted-foreground truncate">{it.retailer}</p>}
                    <p className="font-sans text-sm font-medium leading-snug line-clamp-2 flex-1">{it.title}</p>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      {it.price_cents ? (
                        <span className="text-sm font-medium text-rose-deep">{formatMoney(it.price_cents / 100, currencyCode)}</span>
                      ) : <span />}
                      {it.product_url && (
                        <a href={it.product_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-sage-deep hover:underline underline-offset-2">
                          View <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-1.5 right-1.5 flex gap-1">
                    <button onClick={() => toggleMostWanted.mutate({ id: it.id, next: !it.is_most_wanted })}
                      className={cn("rounded-full bg-pearl/90 backdrop-blur p-1", it.is_most_wanted ? "text-rose-deep" : "text-muted-foreground hover:text-rose-deep")}
                      title={it.is_most_wanted ? "Remove from most wanted" : "Mark as most wanted"}>
                      <Star className={cn("h-3 w-3", it.is_most_wanted && "fill-current")} />
                    </button>
                    <button onClick={() => removeItem.mutate(it.id)} className="rounded-full bg-pearl/90 backdrop-blur p-1 text-muted-foreground hover:text-cherry">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>

        <aside className="paper-card p-6 h-fit lg:sticky lg:top-6">
          <h3 className="font-sans text-xl font-semibold">Add item</h3>
          <p className="mt-1 text-sm text-muted-foreground">Paste a product URL and we'll try to fill in the details — works for most retailers.</p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="relative">
                <input placeholder="Product URL" value={form.product_url}
                  onChange={(e) => { setForm({ ...form, product_url: e.target.value }); setAutoFillFailed(false); }}
                  onBlur={onUrlBlur}
                  className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
                {fetchingDetails && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-cherry" />}
              </div>
              {autoFillFailed && <p className="mt-1.5 text-sm text-muted-foreground">This retailer doesn't allow auto-fill — no problem, just add the details below.</p>}
            </div>

            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />

            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Retailer" value={form.retailer} onChange={(e) => setForm({ ...form, retailer: e.target.value })} className="rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm" />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">{CURRENCIES[currencyCode].symbol}</span>
                <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl pl-10 pr-3 py-2.5 text-sm" />
              </div>
            </div>

            <input placeholder="Image URL (optional)" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />

            <button type="button" onClick={() => setForm({ ...form, is_most_wanted: !form.is_most_wanted })}
              className={cn(
                "w-full inline-flex items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm transition-colors",
                form.is_most_wanted ? "bg-rose-deep text-pearl border-rose-deep" : "border-line text-muted-foreground hover:bg-stone",
              )}>
              <Star className={cn("h-4 w-4", form.is_most_wanted && "fill-current")} />
              {form.is_most_wanted ? "Marked as most wanted" : "Mark as most wanted"}
            </button>

            <button onClick={() => addItem.mutate()} disabled={addItem.isPending} className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-rose-deep text-pearl py-2.5 text-sm hover:bg-rose-deep-hover disabled:opacity-60">
              <Plus className="h-4 w-4" /> Add to registry
            </button>
          </div>
        </aside>
      </div>

      {shareOpen && <ShareDialog url={shareUrl} wedding={wedding} onClose={() => setShareOpen(false)} />}
    </AppShell>
  );
}

// Country/currency used to be its own full-width card — most couples set it
// once and never touch it again, so it lives here instead as a compact
// top-right control, expanding into the two dropdowns only when opened.
function RegistryLocaleButton({ country, currency, countryOptions, currencyOptions, onCountryChange, onCurrencyChange }: {
  country: string; currency: string;
  countryOptions: { value: string; label: string }[]; currencyOptions: { value: string; label: string }[];
  onCountryChange: (v: string) => void; onCurrencyChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-paper px-4 py-2 text-xs hover:bg-stone transition-colors">
        {country} · {currency} <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-20 w-48 rounded-lg border border-line bg-pearl shadow-lg p-3 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-cherry">Country</p>
              <Dropdown size="sm" className="mt-1.5" value={country} onChange={onCountryChange} options={countryOptions} placeholder="Country" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-cherry">Currency</p>
              <Dropdown size="sm" className="mt-1.5" value={currency} onChange={onCurrencyChange} options={currencyOptions} placeholder="Currency" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ShareDialog({ url, wedding, onClose }: { url: string; wedding: any; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const message = `We've made a wedding registry! Take a look 💛\n${wedding.partner_a} & ${wedding.partner_b}\n${url}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}`;

  const copy = async () => { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="paper-card w-full max-w-md p-6 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-cherry"><X className="h-4 w-4" /></button>
        <p className="text-sm uppercase tracking-widest text-cherry">Share registry</p>
        <h3 className="mt-1 font-serif text-2xl">Send it to your guests</h3>

        <div className="mt-5 flex items-center gap-2 rounded-full border border-line bg-pearl p-1 pl-4">
          <span className="flex-1 truncate font-mono text-sm">{url}</span>
          <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-wine text-pearl px-4 py-2 text-sm hover:bg-cherry">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
        </div>

        <a href={waHref} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white py-3 text-sm hover:opacity-90">
          <MessageCircle className="h-4 w-4" /> Share on WhatsApp
        </a>

        <div className="mt-5 pt-5 border-t border-line">
          <p className="text-sm uppercase tracking-widest text-muted-foreground text-center">Or scan the QR code</p>
          <div className="mt-3 grid place-items-center">
            <img src={qrSrc} alt="Registry QR code" width={200} height={200} className="rounded-2xl border border-line" />
          </div>
        </div>

        <p className="mt-5 text-sm text-muted-foreground text-center">Your registry is public: anyone with this link can view it. It also appears on your wedding site.</p>
      </div>
    </div>
  );
}
