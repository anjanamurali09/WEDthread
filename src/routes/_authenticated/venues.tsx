import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Users2, Search, MessageCircle, Send, Award } from "lucide-react";
import { LeadDialog } from "@/components/lead-dialog";
import { whatsappUrl, buildLeadMessage } from "@/lib/lead-utm";
import { useCurrentWedding } from "@/lib/wedding-hooks";
import { formatNumber } from "@/lib/utils";

export const VENUE_TYPES = [
  "Ballrooms & Banquet Halls", "Hotels & Resorts", "Farms, Barns & Ranches",
  "Gardens & Parks", "Beaches & Waterfront", "Historic Estates & Mansions",
  "Vineyards & Wineries", "Rooftops", "Museums & Galleries",
  "Country Clubs & Golf Courses", "Industrial & Warehouse", "Religious Institutions",
  "Tented & Marquee", "Private Estates",
];
export const VENUE_SETTINGS = ["Indoor", "Outdoor", "Covered Outdoor"];
const CAPACITY_RANGES = [
  { label: "Up to 50", min: 0, max: 50 },
  { label: "51–150", min: 51, max: 150 },
  { label: "151–300", min: 151, max: 300 },
  { label: "300+", min: 301, max: Infinity },
];

export const Route = createFileRoute("/_authenticated/venues")({ component: VenuesPage });

function VenuesPage() {
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [tier, setTier] = useState<number | null>(null);
  const [capacityRange, setCapacityRange] = useState<string | null>(null);
  const [settings, setSettings] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [leadFor, setLeadFor] = useState<any>(null);
  const { data: wedding } = useCurrentWedding();

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues", "approved"],
    queryFn: async () => (await supabase.from("venues").select("*").eq("status", "approved").order("name")).data ?? [],
  });

  const allAmenities = useMemo(() => {
    const s = new Set<string>();
    for (const v of venues as any[]) (v.facilities ?? []).forEach((f: string) => s.add(f));
    return Array.from(s).sort();
  }, [venues]);

  const toggleIn = (arr: string[], v: string) => arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const filtered = (venues as any[]).filter((v) => {
    const loc = location.trim().toLowerCase();
    const capacity = v.capacity_seated ?? v.capacity ?? 0;
    const range = CAPACITY_RANGES.find((r) => r.label === capacityRange);
    return (
      (!q || v.name.toLowerCase().includes(q.toLowerCase())) &&
      (!loc || (v.city || "").toLowerCase().includes(loc) || (v.country || "").toLowerCase().includes(loc)) &&
      (tier === null || v.price_tier === tier) &&
      (!range || (capacity >= range.min && capacity <= range.max)) &&
      (settings.length === 0 || settings.some((s) => (v.setting ?? []).includes(s))) &&
      (types.length === 0 || types.some((t) => (v.venue_type ?? []).includes(t))) &&
      (!featuredOnly || v.is_featured) &&
      (amenities.length === 0 || amenities.every((a) => (v.facilities ?? []).includes(a)))
    );
  });

  const clearAll = () => {
    setQ(""); setLocation(""); setTier(null); setCapacityRange(null);
    setSettings([]); setTypes([]); setFeaturedOnly(false); setAmenities([]);
  };
  const anyFilter = q || location || tier !== null || capacityRange || settings.length || types.length || featuredOnly || amenities.length;

  return (
    <AppShell title="Venues" subtitle="Palaces, resorts, vineyards, hill retreats. Filter by destination, capacity and price.">
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name…" className="w-full rounded-full border border-line pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry bg-pearl" />
        </div>
        <div className="relative flex-1 min-w-[220px]">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location: city or country…" className="w-full rounded-full border border-line pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry bg-pearl" />
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-6 items-start">
        <aside className="lg:sticky lg:top-24 space-y-5">
          {anyFilter && (
            <button onClick={clearAll} className="text-sm text-muted-foreground hover:text-cherry">Clear all filters</button>
          )}

          <FilterGroup title="Price">
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setTier(null)} className={`chip ${tier === null ? "chip-active" : ""}`}>Any</button>
              {[1, 2, 3, 4, 5].map((t) => (
                <button key={t} onClick={() => setTier(tier === t ? null : t)} className={`chip ${tier === t ? "chip-active" : ""}`}>{"$".repeat(t)}</button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup title="Capacity">
            <CheckList items={CAPACITY_RANGES.map((r) => r.label)} value={capacityRange ? [capacityRange] : []}
              onToggle={(v) => setCapacityRange(capacityRange === v ? null : v)} />
          </FilterGroup>

          <FilterGroup title="Indoor/outdoor">
            <CheckList items={VENUE_SETTINGS} value={settings} onToggle={(v) => setSettings(toggleIn(settings, v))} />
          </FilterGroup>

          <FilterGroup title="Venue type">
            <CheckList items={VENUE_TYPES} value={types} onToggle={(v) => setTypes(toggleIn(types, v))} />
          </FilterGroup>

          <FilterGroup title="Award winners">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={featuredOnly} onChange={(e) => setFeaturedOnly(e.target.checked)} className="accent-cherry" />
              <span className="inline-flex items-center gap-1"><Award className="h-3.5 w-3.5" /> Award winners only</span>
            </label>
          </FilterGroup>

          {allAmenities.length > 0 && (
            <FilterGroup title="Amenities">
              <CheckList items={allAmenities} value={amenities} onToggle={(v) => setAmenities(toggleIn(amenities, v))} />
            </FilterGroup>
          )}
        </aside>

        <div>
          <style>{`.chip{border-radius:999px;padding:0.4rem 0.9rem;font-size:0.8rem;border:1px solid var(--line);background:var(--paper);color:var(--ink)}.chip:hover{background:var(--cream)}.chip-active{background:var(--cherry);color:var(--pearl);border-color:var(--cherry)}`}</style>

          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-line p-16 text-center">
              <h3 className="font-serif text-2xl">Venue directory is filling up</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">We're onboarding destination venues. If you own a venue, list it from the sign-in page.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map((v: any) => {
                const priceLabel = v.price_tier ? "$".repeat(v.price_tier) : "";
                const waMsg = buildLeadMessage({
                  partnerA: wedding?.partner_a, partnerB: wedding?.partner_b,
                  city: wedding?.destination_city, country: wedding?.destination_country,
                  guests: wedding?.est_guest_count, targetName: v.name,
                });
                const waHref = v.whatsapp ? whatsappUrl(v.whatsapp, waMsg, "venue", v.id) : null;
                return (
                  <article key={v.id} className="paper-card overflow-hidden flex flex-col">
                    <div className="relative aspect-[4/3] bg-stone" style={v.hero_image ? { backgroundImage: `url(${v.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}>
                      {v.is_featured && (
                        <span className="absolute top-2 left-2 rounded-full bg-cherry text-pearl text-xs px-2 py-1 inline-flex items-center gap-1">
                          <Award className="h-3 w-3" /> Award winner
                        </span>
                      )}
                    </div>
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-xl">{v.name}</h3>
                        {priceLabel && <span className="text-sm text-cherry font-medium">{priceLabel}{v.currency ? ` ${v.currency}` : ""}</span>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.city}, {v.country}</p>
                      {(v.capacity_seated || v.capacity) && <p className="text-sm text-muted-foreground inline-flex items-center gap-1 mt-1"><Users2 className="h-3 w-3" /> up to {formatNumber(v.capacity_seated ?? v.capacity)} seated{v.capacity_standing ? ` · ${formatNumber(v.capacity_standing)} standing` : ""}</p>}
                      {v.description && <p className="mt-3 text-sm text-ink line-clamp-2">{v.description}</p>}
                      {v.facilities?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {v.facilities.slice(0, 4).map((f: string) => <span key={f} className="text-xs rounded-full bg-sage-soft px-2 py-0.5">{f}</span>)}
                        </div>
                      )}
                      <div className="mt-auto pt-4 flex gap-2">
                        <button onClick={() => setLeadFor({ kind: "venue", target: { id: v.id, name: v.name, city: v.city, country: v.country, currency: v.currency } })}
                          className="flex-1 rounded-full bg-cherry text-pearl text-sm px-3 py-2 hover:bg-wine transition-colors inline-flex items-center justify-center gap-1">
                          <Send className="h-3 w-3" /> I'm interested
                        </button>
                        {waHref && (
                          <a href={waHref} target="_blank" rel="noreferrer" className="rounded-full border border-line text-sm px-3 py-2 hover:border-cherry inline-flex items-center gap-1">
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
        </div>
      </div>
      <LeadDialog open={!!leadFor} onOpenChange={(v) => !v && setLeadFor(null)} kind={leadFor?.kind ?? "venue"} target={leadFor?.target ?? null} />
    </AppShell>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line/60 pb-4">
      <h4 className="text-sm uppercase tracking-widest text-muted-foreground mb-2.5">{title}</h4>
      {children}
    </div>
  );
}

function CheckList({ items, value, onToggle }: { items: string[]; value: string[]; onToggle: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <label key={it} className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={value.includes(it)} onChange={() => onToggle(it)} className="accent-cherry" />
          <span>{it}</span>
        </label>
      ))}
    </div>
  );
}
