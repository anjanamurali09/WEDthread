import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { GiftBoxDecor } from "@/components/gift-box-decor";
import { useCurrentWedding } from "@/lib/wedding-hooks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2, Globe2, Share2, Copy, Check, MessageCircle, Loader2, ImageOff, X } from "lucide-react";
import { fetchProductPreview } from "@/lib/product-preview.functions";
import { PhotoEmptyState } from "@/components/photo-empty-state";

export const Route = createFileRoute("/_authenticated/registry")({ component: RegistryPage });

const COUNTRY_SITES: Record<string, { name: string; url: string }[]> = {
  US: [{ name: "Amazon", url: "https://amazon.com" }, { name: "Crate & Barrel", url: "https://crateandbarrel.com" }, { name: "West Elm", url: "https://westelm.com" }, { name: "Williams-Sonoma", url: "https://williams-sonoma.com" }],
  UK: [{ name: "John Lewis", url: "https://johnlewis.com" }, { name: "Selfridges", url: "https://selfridges.com" }, { name: "Amazon UK", url: "https://amazon.co.uk" }],
  IN: [{ name: "Amazon India", url: "https://amazon.in" }, { name: "Fabindia", url: "https://fabindia.com" }, { name: "Nicobar", url: "https://nicobar.com" }, { name: "Good Earth", url: "https://goodearth.in" }],
  AE: [{ name: "Amazon.ae", url: "https://amazon.ae" }, { name: "Bloomingdale's UAE", url: "https://bloomingdales.ae" }, { name: "Ounass", url: "https://ounass.ae" }, { name: "Level Shoes", url: "https://levelshoes.com" }, { name: "Crate & Barrel", url: "https://crateandbarrel.ae" }, { name: "Marina Home", url: "https://marinahome.com" }, { name: "Tiffany & Co.", url: "https://tiffany.ae" }],
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

function withUtm(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    const u = new URL(rawUrl);
    u.searchParams.set("utm_source", "vowzy");
    u.searchParams.set("utm_medium", "referral");
    u.searchParams.set("utm_campaign", "registry");
    return u.toString();
  } catch { return rawUrl; }
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
  const preview = useServerFn(fetchProductPreview);
  const [shareOpen, setShareOpen] = useState(false);

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

  const [form, setForm] = useState({ title: "", product_url: "", price: "", retailer: "", image_url: "" });
  const [fetching, setFetching] = useState(false);
  const [autoFilled, setAutoFilled] = useState(false);

  // Auto-fetch preview when URL looks valid
  useEffect(() => {
    const url = form.product_url.trim();
    if (!url || !/^https?:\/\//i.test(url)) { setAutoFilled(false); return; }
    let cancelled = false;
    setFetching(true);
    const t = setTimeout(async () => {
      try {
        const p = await preview({ data: { url } });
        if (cancelled) return;
        setForm((f) => ({
          ...f,
          title: f.title || p.title || "",
          image_url: f.image_url || p.image || "",
          retailer: f.retailer || p.retailer || "",
          price: f.price || (p.price ? String(p.price) : ""),
        }));
        setAutoFilled(!!(p.title || p.image));
      } catch { /* silent */ }
      finally { if (!cancelled) setFetching(false); }
    }, 500);
    return () => { cancelled = true; clearTimeout(t); setFetching(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product_url]);

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
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] });
      setForm({ title: "", product_url: "", price: "", retailer: "", image_url: "" });
      setAutoFilled(false);
      toast.success("Added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("registry_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["registry-items", registry?.id] }),
  });

  if (!wedding) {
    return <AppShell title="Registry" decor={<GiftBoxDecor />}><p className="text-sm text-muted-foreground">Finish onboarding first to create a registry.</p></AppShell>;
  }

  if (!registry) {
    return (
      <AppShell title="Registry" subtitle="Curate a gift list from retailers in your country. One link, shared with guests." decor={<GiftBoxDecor />}>
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
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/w/${wedding.slug}/registry` : "";

  return (
    <AppShell title="Registry" subtitle="Paste any product link — we'll grab the photo, title and price automatically." decor={<GiftBoxDecor />}>
      {/* Share bar */}
      <div className="paper-card p-4 md:p-5 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest text-cherry">Your registry link</p>
          <p className="mt-1 font-mono text-xs md:text-sm truncate">{shareUrl || `…/w/${wedding.slug}/registry`}</p>
        </div>
        <button onClick={() => setShareOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-wine text-pearl px-5 py-2.5 text-sm hover:bg-cherry transition-colors">
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>

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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {items.length === 0 ? (
              <div className="col-span-full">
                <PhotoEmptyState
                  photo="garden"
                  variant="landscape"
                  eyebrow="Your registry"
                  title="A few things you've been dreaming of"
                  body="Paste any product link on the right — we'll grab the photo, price, and retailer automatically."
                />
              </div>
            ) : items.map((it: any) => (
              <div key={it.id} className="paper-card overflow-hidden group relative flex flex-col">
                <div className="aspect-square bg-pearl border-b border-line overflow-hidden">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground/40">
                      <ImageOff className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="p-3 flex-1 flex flex-col gap-1">
                  {it.retailer && <p className="text-[9px] uppercase tracking-widest text-muted-foreground truncate">{it.retailer}</p>}
                  <p className="font-serif text-sm leading-snug line-clamp-2 flex-1">{it.title}</p>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    {it.price_cents ? (
                      <span className="text-xs font-medium text-wine">{formatPrice(it.price_cents, registry.country_code ?? "US")}</span>
                    ) : <span />}
                    {it.product_url && (
                      <a href={it.product_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-cherry hover:underline underline-offset-2">
                        View <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                </div>
                <button onClick={() => removeItem.mutate(it.id)} className="absolute top-1.5 right-1.5 rounded-full bg-pearl/90 backdrop-blur p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-cherry">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

        </section>

        <aside className="paper-card p-6 h-fit lg:sticky lg:top-6">
          <h3 className="font-serif text-xl">Add item</h3>
          <p className="mt-1 text-xs text-muted-foreground">Paste a product URL — photo and details auto-fill.</p>
          <div className="mt-4 space-y-3">
            <div className="relative">
              <input placeholder="Product URL (paste here first)" value={form.product_url} onChange={(e) => setForm({ ...form, product_url: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />
              {fetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-cherry" />}
              {!fetching && autoFilled && <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />}
            </div>

            {form.image_url && (
              <div className="relative rounded-2xl overflow-hidden border border-line bg-pearl">
                <img src={form.image_url} alt="preview" className="w-full h-40 object-cover" onError={() => setForm((f) => ({ ...f, image_url: "" }))} />
                <button onClick={() => setForm({ ...form, image_url: "" })} className="absolute top-2 right-2 rounded-full bg-pearl/90 p-1 text-muted-foreground hover:text-cherry">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-2xl border border-line bg-pearl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry" />

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

      {shareOpen && <ShareDialog url={shareUrl} wedding={wedding} onClose={() => setShareOpen(false)} />}
    </AppShell>
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
        <p className="text-[11px] uppercase tracking-widest text-cherry">Share registry</p>
        <h3 className="mt-1 font-serif text-2xl">Send it to your guests</h3>

        <div className="mt-5 flex items-center gap-2 rounded-full border border-line bg-pearl p-1 pl-4">
          <span className="flex-1 truncate font-mono text-xs">{url}</span>
          <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-full bg-wine text-pearl px-4 py-2 text-xs hover:bg-cherry">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
        </div>

        <a href={waHref} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#25D366] text-white py-3 text-sm hover:opacity-90">
          <MessageCircle className="h-4 w-4" /> Share on WhatsApp
        </a>

        <div className="mt-5 pt-5 border-t border-line">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground text-center">Or scan the QR code</p>
          <div className="mt-3 grid place-items-center">
            <img src={qrSrc} alt="Registry QR code" width={200} height={200} className="rounded-2xl border border-line" />
          </div>
        </div>

        <p className="mt-5 text-[11px] text-muted-foreground text-center">Your registry is public — anyone with this link can view it. It also appears on your wedding site.</p>
      </div>
    </div>
  );
}
