import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Users2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/venues")({ component: VenuesPage });

function VenuesPage() {
  const [q, setQ] = useState("");
  const [country, setCountry] = useState("");

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ["venues"],
    queryFn: async () => {
      const { data } = await supabase.from("venues").select("*").order("name");
      return data ?? [];
    },
  });

  const countries = [...new Set(venues.map((v: any) => v.country))].sort();
  const filtered = venues.filter((v: any) =>
    (!country || v.country === country) &&
    (!q || v.name.toLowerCase().includes(q.toLowerCase()) || (v.city || "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <AppShell title="Venues" subtitle="Palaces, resorts, vineyards, hill retreats, shortlist for your destination and capacity.">
      <div className="flex flex-wrap gap-2 mb-6">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or city…" className="w-full rounded-full border border-line pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-clay" />
        </div>
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="rounded-full border border-line px-4 py-2.5 text-sm bg-paper">
          <option value="">All countries</option>
          {countries.map((c) => <option key={c as string} value={c as string}>{c as string}</option>)}
        </select>
      </div>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line p-16 text-center">
          <h3 className="font-serif text-2xl">Venue directory is filling up</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">We're onboarding destination venues in India first. In the meantime, add a custom venue directly to any event.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((v: any) => (
            <article key={v.id} className="paper-card overflow-hidden">
              <div className="aspect-[4/3] bg-stone" style={v.hero_image ? { backgroundImage: `url(${v.hero_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}} />
              <div className="p-5">
                <h3 className="font-serif text-xl">{v.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {v.city}, {v.country}</p>
                {v.capacity && <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-1"><Users2 className="h-3 w-3" /> up to {v.capacity} guests</p>}
                {v.description && <p className="mt-3 text-sm text-ink/70 line-clamp-3">{v.description}</p>}
                {v.price_range && <p className="mt-3 text-xs text-clay">{v.price_range}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
