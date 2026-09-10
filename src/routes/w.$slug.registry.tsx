import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Sparkles, Heart, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { RetailerFallback } from "@/components/retailer-fallback";

export const Route = createFileRoute("/w/$slug/registry")({ component: PublicRegistry });

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
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.code, maximumFractionDigits: 2 }).format(cents / 100);
  } catch { return `${c.symbol} ${(cents / 100).toFixed(2)}`; }
}

function PublicRegistry() {
  const { slug } = Route.useParams();
  const [wedding, setWedding] = useState<any>(null);
  const [registry, setRegistry] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase.from("weddings").select("id, partner_a, partner_b, slug").eq("slug", slug).maybeSingle();
      if (!w) { setLoading(false); return; }
      setWedding(w);
      const { data: r } = await supabase.from("registries").select("*").eq("wedding_id", w.id).eq("is_public", true).maybeSingle();
      if (!r) { setLoading(false); return; }
      setRegistry(r);
      const { data: its } = await supabase.from("registry_items").select("*").eq("registry_id", r.id).order("sort_order");
      setItems(its ?? []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-pearl"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!wedding || !registry) return (
    <div className="min-h-screen grid place-items-center bg-pearl text-center px-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-cherry">Not found</p>
        <h1 className="mt-2 font-serif text-3xl">This registry isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">The couple may have set it to private.</p>
      </div>
    </div>
  );

  const country = registry.country_code ?? "US";

  return (
    <div className="min-h-screen bg-pearl">
      {/* Hero */}
      <header className="max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
        <p className="text-sm uppercase tracking-[0.35em] text-cherry">Wedding registry</p>
        <h1 className="mt-6 font-serif" style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)", lineHeight: 1 }}>
          {wedding.partner_a} <span className="text-wine italic">&</span> {wedding.partner_b}
        </h1>
        <p className="mt-6 max-w-xl mx-auto text-sm text-muted-foreground">
          Your presence is the greatest gift, but if you'd like to celebrate with something more, here are a few things we've been dreaming of.
        </p>
      </header>

      {/* Items */}
      <main className="max-w-5xl mx-auto px-6 pb-24">
        {items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-line p-16 text-center bg-paper">
            <p className="font-serif text-2xl">The registry is being curated</p>
            <p className="mt-2 text-sm text-muted-foreground">Check back soon. The couple is adding items.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((it: any) => (
              <a
                key={it.id}
                href={it.product_url ?? "#"}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(
                  "paper-card overflow-hidden group relative flex flex-col transition-all hover:-translate-y-1 hover:shadow-lg",
                  it.is_most_wanted && "ring-2 ring-rose-deep",
                )}
              >
                <div className="aspect-square bg-pearl border-b border-line overflow-hidden">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <RetailerFallback productUrl={it.product_url} retailer={it.retailer}
                      iconClassName="h-14 w-14" textClassName="text-sm" />
                  )}
                </div>
                {it.is_most_wanted && (
                  <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-rose-deep text-pearl px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide">
                    <Star className="h-3 w-3 fill-current" /> Most wanted
                  </span>
                )}
                <div className="p-5 flex-1 flex flex-col">
                  {it.retailer && <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{it.retailer}</p>}
                  <p className="mt-1 font-serif text-lg leading-snug line-clamp-2 flex-1">{it.title}</p>
                  <div className="mt-3 flex items-center justify-between">
                    {it.price_cents ? (
                      <span className="text-sm font-medium text-rose-deep">{formatPrice(it.price_cents, country)}</span>
                    ) : <span />}
                    {it.product_url && (
                      <span className="inline-flex items-center gap-1 text-sm text-sage-deep group-hover:underline underline-offset-2">
                        View <ExternalLink className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="mt-16 text-center">
          <Link to="/w/$slug" params={{ slug }} className="inline-flex items-center gap-2 text-sm uppercase tracking-widest text-muted-foreground hover:text-cherry">
            <Heart className="h-3 w-3" /> Back to wedding site
          </Link>
        </div>
      </main>

      <footer className="border-t border-line py-6 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-3 w-3 text-cherry" /> Made with WedThread
        </div>
      </footer>
    </div>
  );
}
