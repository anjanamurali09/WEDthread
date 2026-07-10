import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Users2, Search, MessageCircle, Send } from "lucide-react";
import { LeadDialog } from "@/components/lead-dialog";
import { whatsappUrl, buildLeadMessage } from "@/lib/lead-utm";
import { useCurrentWedding } from "@/lib/wedding-hooks";

export const Route = createFileRoute("/_authenticated/venues")({ component: VenuesPage });

function VenuesPage() {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");
  const [tier, setTier] = useState<number | null>(null);
  const [leadFor, setLeadFor] = useState<any>(null);
  const { data: wedding } = useCurrentWedding();

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => (await supabase.from("venues").select("*").order("name")).data ?? [],
  });

  const countries = [...new Set(venues.map((v: any) => v.country))].sort();
  const filtered = venues.filter((v: any) =>
    (!country || v.country === country) &&
    (tier === null || v.price_tier === tier) &&
    (!q || v.name.toLowerCase().includes(q.toLowerCase()) || (v.city || "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppShell title="Venues" subtitle="Palaces, resorts, vineyards, hill retreats — filter by destination, capacity and price.">
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or city…" className="w-full rounded-full border border-line pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cherry bg-pearl" />
        </div>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-full border border-line px-4 py-2.5 text-sm bg-paper">
          <option value="">All countries</option>
          {countries.map((c) => <option key={c as string} value={c as string}>{c as string}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        <button onClick={() => setTier(null)} className={`chip ${tier === null ? "chip-active" : ""}`}>Any price</button>
        {[1, 2, 3, 4, 5].map((t) => (
          <button key={t} onClick={() => setTier(t)} className={`chip ${tier === t ? "chip-active" : ""}`}>{"$".repeat(t)}</button>
        ))}
      </div>

      <style>{`.chip{border-radius:999px;padding:0.4rem 0.9rem;font-size:0.8rem;border:1px solid var(--line);background:var(--paper);color:var(--ink)}.chip:hover{background:var(--cream)}.chip-active{background:var(--cherry);color:var(--pearl);border-color:var(--cherry)}`}</style>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <h3 className="font-serif text-2xl">Venue directory is filling up</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">We're onboarding destination venues. If you own a venue, list it from the sign-in page.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                <div className="aspect-[4/3] bg-stone" style={v.hero_image ? { backgroundImage: `url(${v.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-serif text-xl">{v.name}</h3>
                    {priceLabel && <span className="text-xs text-cherry font-medium">{priceLabel}{v.currency ? ` ${v.currency}` : ""}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.city}, {v.country}</p>
                  {(v.capacity_seated || v.capacity) && <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1"><Users2 className="h-3 w-3" /> up to {v.capacity_seated ?? v.capacity} seated{v.capacity_standing ? ` · ${v.capacity_standing} standing` : ""}</p>}
                  {v.description && <p className="mt-3 text-sm text-ink/70 line-clamp-2">{v.description}</p>}
                  {v.facilities?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {v.facilities.slice(0, 4).map((f: string) => <span key={f} className="text-[10px] rounded-full bg-sage-soft px-2 py-0.5">{f}</span>)}
                    </div>
                  )}
                  <div className="mt-auto pt-4 flex gap-2">
                    <button onClick={() => setLeadFor({ kind: "venue", target: { id: v.id, name: v.name, city: v.city, country: v.country, currency: v.currency } })}
                      className="flex-1 rounded-full bg-cherry text-pearl text-xs px-3 py-2 hover:bg-wine transition-colors inline-flex items-center justify-center gap-1">
                      <Send className="h-3 w-3" /> I'm interested
                    </button>
                    {waHref && (
                      <a href={waHref} target="_blank" rel="noreferrer" className="rounded-full border border-line text-xs px-3 py-2 hover:border-cherry inline-flex items-center gap-1">
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
      <LeadDialog open={!!leadFor} onOpenChange={(v) => !v && setLeadFor(null)} kind={leadFor?.kind ?? "venue"} target={leadFor?.target ?? null} />
    </AppShell>
  );
}
