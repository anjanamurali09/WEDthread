import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Search, X, MessageCircle, Send } from "lucide-react";
import { LeadDialog } from "@/components/lead-dialog";
import { whatsappUrl, buildLeadMessage } from "@/lib/lead-utm";
import { useCurrentWedding } from "@/lib/wedding-hooks";

export const Route = createFileRoute("/_authenticated/vendors")({ component: VendorsPage });

type Cat = { id: string; name: string; slug: string | null; parent_id: string | null; sort_order: number };

function VendorsPage() {
  const [q, setQ] = useState("");
  const [tier1Id, setTier1Id] = useState<string>("");
  const [tier2Id, setTier2Id] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [leadFor, setLeadFor] = useState<any>(null);
  const { data: wedding } = useCurrentWedding();

  const { data: cats = [] } = useQuery({
    queryKey: ["vendor-categories"],
    queryFn: async () => (
      await supabase.from("vendor_categories").select("id,name,slug,parent_id,sort_order").order("sort_order").order("name")
    ).data as Cat[] ?? [],
  });

  const tier1 = useMemo(() => cats.filter((c) => c.parent_id === null), [cats]);
  const tier2 = useMemo(() => cats.filter((c) => c.parent_id === tier1Id), [cats, tier1Id]);

  // Any selected category ids to filter by (subcategory takes precedence, else all children of tier1)
  const activeCatIds = useMemo(() => {
    if (tier2Id) return [tier2Id];
    if (tier1Id) return [tier1Id, ...cats.filter((c) => c.parent_id === tier1Id).map((c) => c.id)];
    return [];
  }, [tier1Id, tier2Id, cats]);

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors", "approved"],
    queryFn: async () => (
      await supabase.from("vendors").select("*").eq("status", "approved").order("business_name")
    ).data ?? [],
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    for (const v of vendors as any[]) (v.tags ?? []).forEach((t: string) => s.add(t));
    return Array.from(s).sort();
  }, [vendors]);

  const filtered = (vendors as any[]).filter((v) =>
    (activeCatIds.length === 0 || activeCatIds.includes(v.category_id)) &&
    (!tag || (v.tags ?? []).includes(tag)) &&
    (!q || v.business_name.toLowerCase().includes(q.toLowerCase()) || (v.description ?? "").toLowerCase().includes(q.toLowerCase()))
  );

  const clear = () => { setTier1Id(""); setTier2Id(""); setTag(""); setQ(""); };
  const anyFilter = tier1Id || tier2Id || tag || q;

  return (
    <AppShell title="Vendors" subtitle="Filter by category, subcategory, and tags — from mehendi artists to invitation designers.">
      {/* Search */}
      <div className="relative max-w-xl mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vendors, styles, cities…" className="w-full rounded-full border border-line pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry bg-pearl" />
      </div>

      {/* Tier 1 chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={() => { setTier1Id(""); setTier2Id(""); }} className={`chip ${!tier1Id ? "chip-active" : ""}`}>All categories</button>
        {tier1.map((c) => (
          <button key={c.id} onClick={() => { setTier1Id(c.id); setTier2Id(""); }} className={`chip ${tier1Id === c.id ? "chip-active" : ""}`}>{c.name}</button>
        ))}
      </div>

      {/* Tier 2 chips */}
      {tier1Id && tier2.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 pl-1 border-l-2 border-wine/30">
          <button onClick={() => setTier2Id("")} className={`chip chip-sm ${!tier2Id ? "chip-active" : ""}`}>All</button>
          {tier2.map((c) => (
            <button key={c.id} onClick={() => setTier2Id(c.id)} className={`chip chip-sm ${tier2Id === c.id ? "chip-active" : ""}`}>{c.name}</button>
          ))}
        </div>
      )}

      {/* Tag chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {allTags.slice(0, 24).map((t) => (
            <button key={t} onClick={() => setTag(tag === t ? "" : t)} className={`text-[11px] rounded-full px-2.5 py-1 border ${tag === t ? "bg-wine text-pearl border-wine" : "border-line text-ink/70 hover:bg-cream"}`}>#{t}</button>
          ))}
        </div>
      )}

      {anyFilter && (
        <button onClick={clear} className="mb-6 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cherry"><X className="h-3 w-3" /> Clear filters</button>
      )}

      <style>{`
        .chip { border-radius: 999px; padding: 0.5rem 0.9rem; font-size: 0.8rem; border: 1px solid var(--line); background: var(--paper); color: var(--ink); }
        .chip:hover { background: var(--cream); }
        .chip-active { background: var(--wine); color: var(--pearl); border-color: var(--wine); }
        .chip-sm { padding: 0.35rem 0.75rem; font-size: 0.72rem; }
      `}</style>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <h3 className="font-serif text-2xl">No vendors yet in this filter</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">We're onboarding vendors across every category. If you provide services yourself, create a vendor account from the sign-in page.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v: any) => {
            const priceLabel = v.price_tier ? "$".repeat(v.price_tier) : "";
            const waMsg = buildLeadMessage({
              partnerA: wedding?.partner_a, partnerB: wedding?.partner_b,
              city: wedding?.destination_city, country: wedding?.destination_country,
              guests: wedding?.est_guest_count, targetName: v.business_name,
            });
            const waHref = v.whatsapp ? whatsappUrl(v.whatsapp, waMsg, "vendor", v.id) : null;
            return (
              <article key={v.id} className="paper-card overflow-hidden flex flex-col">
                <div className="aspect-[4/3] bg-stone" style={v.hero_image ? { backgroundImage: `url(${v.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl">{v.business_name}</h3>
                    {priceLabel && <span className="text-xs text-cherry font-medium">{priceLabel}{v.currency ? ` ${v.currency}` : ""}</span>}
                  </div>
                  {(v.home_city || v.home_country) && <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[v.home_city, v.home_country].filter(Boolean).join(", ")}</p>}
                  {v.description && <p className="mt-3 text-sm text-ink/70 line-clamp-3">{v.description}</p>}
                  {v.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{v.tags.slice(0, 4).map((t: string) => <span key={t} className="text-[10px] rounded-full bg-cream px-2 py-0.5">{t}</span>)}</div>}
                  <div className="mt-auto pt-4 flex gap-2">
                    <button onClick={() => setLeadFor({ kind: "vendor", target: { id: v.id, name: v.business_name, city: v.home_city, country: v.home_country, currency: v.currency } })}
                      className="flex-1 rounded-full bg-cherry text-pearl text-xs px-3 py-2 hover:bg-wine transition-colors inline-flex items-center justify-center gap-1">
                      <Send className="h-3 w-3" /> I'm interested
                    </button>
                    {waHref && (
                      <a href={waHref} target="_blank" rel="noreferrer"
                        className="rounded-full border border-line text-xs px-3 py-2 hover:border-cherry inline-flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <LeadDialog open={!!leadFor} onOpenChange={(v) => !v && setLeadFor(null)} kind={leadFor?.kind ?? "vendor"} target={leadFor?.target ?? null} />
    </AppShell>
  );
}
