import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Check, ExternalLink, Heart, Star, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { createContext, useContext } from "react";
import { RetailerFallback } from "@/components/retailer-fallback";
import { getTemplate, TEMPLATES } from "@/lib/website-templates";
import { useGoogleFonts } from "@/lib/google-fonts";
import { SiteBackdrop, SiteFooter, decorFor } from "@/routes/_authenticated/website_.edit";
import { SiteDecor } from "@/components/botanical-art";
import { DEFAULT_REGISTRY_INTRO } from "@/lib/registry-intro";

// `?preview=1` is the couple looking at their own registry: it ignores the public/published switches
// (their own login lets them read it) and turns the guest actions off.
export const Route = createFileRoute("/w/$slug_/registry")({
  component: PublicRegistry,
  validateSearch: (s: Record<string, unknown>): { preview?: boolean } => ({ preview: s.preview === 1 || s.preview === "1" || s.preview === true ? true : undefined }),
});

// The registry wears the couple's chosen website template: its colours, fonts, decoration and background.
type Theme = { bg: string; ink: string; accent: string; soft: string; display: string };
const ThemeContext = createContext<Theme>({ bg: "#FDFCF7", ink: "#243746", accent: "#243746", soft: "#F7F1E3", display: "serif" });
const useTheme = () => useContext(ThemeContext);

const CURRENCY: Record<string, { code: string; symbol: string; locale: string }> = {
  US: { code: "USD", symbol: "$",   locale: "en-US" },
  UK: { code: "GBP", symbol: "£",   locale: "en-GB" },
  IN: { code: "INR", symbol: "₹",   locale: "en-IN" },
  AE: { code: "AED", symbol: "AED", locale: "en-AE" },
  AU: { code: "AUD", symbol: "A$",  locale: "en-AU" },
  CA: { code: "CAD", symbol: "C$",  locale: "en-CA" },
};

function formatPrice(cents: number, code: string) {
  const c = CURRENCY[code] ?? CURRENCY.US;
  try {
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.code, maximumFractionDigits: 0 }).format(cents / 100);
  } catch { return `${c.symbol} ${Math.round(cents / 100).toLocaleString()}`; }
}

function PublicRegistry() {
  const { slug } = Route.useParams();
  const preview = !!Route.useSearch().preview;
  const [wedding, setWedding] = useState<any>(null);
  const [registry, setRegistry] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [contributing, setContributing] = useState<any>(null);
  const [buying, setBuying] = useState<any>(null);
  const openContribute = (it: any) => { if (!preview) setContributing(it); };
  const openBuy = (it: any) => { if (!preview) setBuying(it); };
  const template = getTemplate(wedding?.site_template_id);
  const custom = (wedding?.site_customization as any) ?? {};
  const palette = { ...template.palette, ...(custom.palette ?? {}) };
  const fonts = { ...template.fonts, ...(custom.fonts ?? {}) };
  useGoogleFonts([fonts.display, fonts.body]);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase.from("weddings").select("id, partner_a, partner_b, slug, site_template_id, site_customization").eq("slug", slug).maybeSingle();
      if (!w) { setLoading(false); return; }
      setWedding(w);
      const { data: r } = await supabase.from("registries").select("*").eq("wedding_id", w.id).maybeSingle();
      if (r && !r.is_public && !preview) { setLoading(false); return; }
      if (!r) { setLoading(false); return; }
      setRegistry(r);
      const { data: its } = await supabase.from("registry_items").select("*").eq("registry_id", r.id).order("sort_order");
      setItems(its ?? []);
      setLoading(false);
    })();
  }, [slug, preview]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-pearl"><p className="text-sm opacity-70">Loading…</p></div>;
  if (!wedding || !registry) return (
    <div className="min-h-screen grid place-items-center bg-pearl text-center px-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-cherry">Not found</p>
        <h1 className="mt-2 font-serif text-3xl">This registry isn't available</h1>
        <p className="mt-2 text-sm opacity-70">{preview ? "Sign in as the couple to preview it." : "The couple may have set it to private."}</p>
      </div>
    </div>
  );

  // Older accounts carry a placeholder id that isn't one of the templates: nothing has been chosen yet.
  if (preview && !TEMPLATES.some((t) => t.id === wedding.site_template_id)) return (
    <div className="min-h-screen grid place-items-center bg-pearl text-center px-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-cherry">Registry preview</p>
        <h1 className="mt-2 font-serif text-3xl">Choose a template first</h1>
        <p className="mt-2 text-sm opacity-70">Your registry wears your wedding website's template. Go to Website and select one to preview it.</p>
        <Link to="/website" className="mt-5 inline-block rounded-full bg-ink text-paper px-5 py-2.5 text-sm hover:bg-[#4A7CAD] transition-colors">Go to Website</Link>
      </div>
    </div>
  );

  const country = registry.country_code ?? "US";

  return (
    <ThemeContext.Provider value={{ ...palette, display: `"${fonts.display}", serif` }}>
    <div className="@container relative isolate min-h-screen"
      style={{ background: palette.bg, color: palette.ink, fontFamily: `"${fonts.body}", sans-serif` }}>
      <SiteBackdrop bg={custom.background} />
      <SiteDecor kind={decorFor(template, custom.decoration)} color={palette.accent} />
      {preview && (
        <div className="sticky top-0 z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-ink px-4 py-2 text-center text-xs text-paper">
          <span>Preview: only you can see this{registry.is_public ? "" : ", and your registry is still private"}. Buying and contributing are switched off.</span>
          <Link to="/registry" data-static className="underline underline-offset-2">Back to registry</Link>
        </div>
      )}
      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="text-sm uppercase tracking-[0.35em]" style={{ color: palette.accent }}>Wedding registry</p>
        <h1 className="mt-6" style={{ fontFamily: `"${fonts.display}", serif`, fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1 }}>
          {wedding.partner_a} <span style={{ color: palette.accent }}>&</span> {wedding.partner_b}
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-sm opacity-70 whitespace-pre-line">
          {custom.registryIntro || DEFAULT_REGISTRY_INTRO}
        </p>
      </section>

      {/* Items */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed p-16 text-center" style={{ borderColor: palette.soft, background: palette.soft }}>
            <p className="text-2xl" style={{ fontFamily: `"${fonts.display}", serif` }}>The registry is being curated</p>
            <p className="mt-2 text-sm opacity-70">Check back soon. The couple is adding items.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {items.map((it: any) => {
              const isFund = it.kind === "fund";
              const bought = !!it.purchased_at;
              const photo = (
                <div className="relative aspect-square overflow-hidden rounded-2xl" style={{ background: palette.soft }}>
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : isFund ? (
                    <div className="grid h-full w-full place-items-center"><Heart className="h-6 w-6 opacity-40" style={{ color: palette.accent }} /></div>
                  ) : (
                    <RetailerFallback productUrl={it.product_url} retailer={it.retailer}
                      iconClassName="h-8 w-8" textClassName="text-xs" />
                  )}
                  {it.is_most_wanted && !bought && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-[#FFE08A] text-ink px-2 py-0.5 text-[8px] font-medium uppercase tracking-wide">
                      <Star className="h-3 w-3 fill-current" /> Most wanted
                    </span>
                  )}
                  {bought && (
                    <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-medium uppercase tracking-wide" style={{ background: palette.accent, color: palette.bg }}>
                      <Check className="h-3 w-3" /> Bought
                    </span>
                  )}
                </div>
              );
              return (
                <div key={it.id} className={cn("group relative flex flex-col transition-all", bought ? "opacity-60" : "hover:-translate-y-1")}>
                  {isFund ? (
                    <button type="button" onClick={() => openContribute(it)} className="block text-left">{photo}</button>
                  ) : it.product_url ? (
                    <a href={it.product_url} target="_blank" rel="noreferrer noopener" className="block">{photo}</a>
                  ) : photo}
                  <div className={cn("mt-3 flex flex-1 flex-col rounded-2xl px-3 py-2.5 transition-shadow group-hover:shadow-lg", it.is_most_wanted && !bought && "ring-2 ring-[#FFE08A]")} style={{ background: palette.soft }}>
                    {isFund
                      ? <p className="text-[8px] uppercase tracking-widest opacity-70">Fund</p>
                      : it.retailer && <p className="text-[8px] uppercase tracking-widest opacity-70 truncate">{it.retailer}</p>}
                    <p className="mt-0.5 text-sm leading-snug line-clamp-2" style={{ fontFamily: `"${fonts.display}", serif` }}>{it.title}</p>
                    {isFund && it.description && <p className="mt-0.5 text-xs opacity-70 line-clamp-2">{it.description}</p>}
                    <div className="mt-2 flex flex-1 items-end justify-between gap-2">
                      {it.price_cents ? (
                        <span className="text-xs font-medium">{formatPrice(it.price_cents, country)}</span>
                      ) : <span />}
                      {!isFund && it.product_url && (
                        <a href={it.product_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs hover:underline underline-offset-2">
                          View <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                    {isFund ? (
                      <button type="button" onClick={() => openContribute(it)}
                        className="mt-2.5 w-full rounded-full px-3 py-1.5 text-xs hover:opacity-85" style={{ background: palette.accent, color: palette.bg }}>Contribute</button>
                    ) : bought ? (
                      <p className="mt-2.5 text-center text-xs opacity-70">Already bought — thank you!</p>
                    ) : (
                      <button type="button" onClick={() => openBuy(it)}
                        className="mt-2.5 w-full rounded-full border px-3 py-1.5 text-xs hover:opacity-70" style={{ borderColor: palette.accent, color: palette.accent }}>Mark as bought</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-16 text-center">
          {preview ? (
            <Link to="/registry" data-static className="inline-flex items-center gap-2 text-sm uppercase tracking-widest">
              <Heart className="h-3 w-3" /> Back to registry
            </Link>
          ) : (
            <Link to="/w/$slug" params={{ slug }} data-static className="inline-flex items-center gap-2 text-sm uppercase tracking-widest">
              <Heart className="h-3 w-3" /> Back to wedding site
            </Link>
          )}
        </div>
      </main>

      {buying && (
        <BoughtDialog item={buying} onClose={() => setBuying(null)}
          onDone={(name) => { setItems((cur) => cur.map((i) => (i.id === buying.id ? { ...i, purchased_by: name, purchased_at: new Date().toISOString() } : i))); setBuying(null); }} />
      )}
      {contributing && <ContributeDialog item={contributing} country={country} instructions={contributing.retailer || registry.contribution_instructions} onClose={() => setContributing(null)} />}

      <SiteFooter palette={palette} />
    </div>
    </ThemeContext.Provider>
  );
}

const FIELD = "w-full rounded-2xl border border-current/25 bg-transparent px-4 py-2.5 text-sm placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-current/40";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-3xl p-6 shadow-xl" style={{ background: t.bg, color: t.ink }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
        <h3 className="pr-6 text-2xl" style={{ fontFamily: t.display }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

// A guest marks a gift as bought, so nobody else buys the same thing.
function BoughtDialog({ item, onClose, onDone }: { item: any; onClose: () => void; onDone: (name: string) => void }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true); setError(null);
    const { error: err } = await (supabase as any).rpc("mark_registry_item_purchased", { p_item_id: item.id, p_name: name });
    setBusy(false);
    if (err) return setError(err.message);
    onDone(name.trim() || "A guest");
  };
  return (
    <Modal title="Mark as bought" onClose={onClose}>
      <p className="mt-2 text-sm opacity-70">Let the couple (and other guests) know you've got “{item.title}”.</p>
      <input className={cn(FIELD, "mt-4")} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <button onClick={submit} disabled={busy} style={{ background: theme.accent, color: theme.bg }} className="mt-4 w-full rounded-full px-4 py-2.5 text-sm hover:opacity-85 disabled:opacity-60">
        {busy ? "Saving…" : "I bought this"}
      </button>
    </Modal>
  );
}

// A guest pledges an amount to a fund; afterwards they see how the couple would like to receive it.
function ContributeDialog({ item, country, instructions, onClose }: { item: any; country: string; instructions?: string | null; onClose: () => void }) {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState(item.price_cents ? String(item.price_cents / 100) : "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const submit = async () => {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) return setError("Enter an amount.");
    setBusy(true); setError(null);
    const { error: err } = await (supabase as any).rpc("contribute_to_registry_fund", { p_item_id: item.id, p_name: name, p_amount_cents: cents, p_message: message });
    setBusy(false);
    if (err) return setError(err.message);
    setDone(true);
  };
  return (
    <Modal title={done ? "Thank you!" : item.title} onClose={onClose}>
      {done ? (
        <>
          <p className="mt-2 text-sm opacity-70">Your contribution to “{item.title}” has been noted.</p>
          {instructions
            ? <div className="mt-4 rounded-2xl p-4 text-sm whitespace-pre-wrap" style={{ background: theme.soft }}><span className="block text-xs uppercase tracking-widest opacity-60">How to send it</span>{instructions}</div>
            : <p className="mt-4 text-sm opacity-70">The couple will be in touch about how to send it.</p>}
          <button onClick={onClose} style={{ background: theme.accent, color: theme.bg }} className="mt-4 w-full rounded-full px-4 py-2.5 text-sm hover:opacity-85">Done</button>
        </>
      ) : (
        <>
          {item.image_url && <img src={item.image_url} alt="" className="mt-3 h-36 w-full rounded-2xl object-cover" />}
          {item.description && <p className="mt-3 text-sm opacity-70 whitespace-pre-wrap">{item.description}</p>}
          <input className={cn(FIELD, "mt-4")} placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm opacity-70">{(CURRENCY[country] ?? CURRENCY.US).symbol}</span>
            <input className={FIELD} style={{ paddingLeft: 24 + (CURRENCY[country] ?? CURRENCY.US).symbol.length * 8 }} type="number" step="0.01" min="0" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <textarea rows={2} className={cn(FIELD, "mt-2 resize-none")} placeholder="A message for the couple (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <button onClick={submit} disabled={busy} style={{ background: theme.accent, color: theme.bg }} className="mt-4 w-full rounded-full px-4 py-2.5 text-sm hover:opacity-85 disabled:opacity-60">
            {busy ? "Saving…" : "Contribute"}
          </button>
        </>
      )}
    </Modal>
  );
}
