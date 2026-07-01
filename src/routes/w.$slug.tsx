import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, MapPin, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/w/$slug")({ component: WeddingSite });

function WeddingSite() {
  const { slug } = Route.useParams();
  const [wedding, setWedding] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase.from("weddings").select("*").eq("slug", slug).eq("site_published", true).maybeSingle();
      if (!w) { setLoading(false); return; }
      setWedding(w);
      const { data: ev } = await supabase.from("events").select("*").eq("wedding_id", w.id).order("event_date");
      setEvents(ev ?? []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-paper"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!wedding) return (
    <div className="min-h-screen grid place-items-center bg-paper text-center px-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-clay">Not found</p>
        <h1 className="mt-2 font-serif text-3xl">This wedding site isn't published yet</h1>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      <section className="min-h-[92vh] flex flex-col items-center justify-center text-center px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--clay) 0 8%, transparent 9%), radial-gradient(circle at 80% 60%, var(--ink) 0 5%, transparent 6%)" }} />
        <p className="relative text-[11px] uppercase tracking-[0.35em] text-clay">Together with their families</p>
        <h1 className="relative mt-8 font-serif text-6xl md:text-8xl leading-[0.95]">{wedding.partner_a}<br/><span className="text-clay">&amp;</span><br/>{wedding.partner_b}</h1>
        <p className="relative mt-8 text-sm text-muted-foreground">
          {wedding.destination_city && `${wedding.destination_city}, `}{wedding.destination_country}
        </p>
      </section>

      <section className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-center text-[11px] uppercase tracking-[0.25em] text-clay">The celebrations</p>
        <div className="mt-10 space-y-4">
          {events.map((e, i) => (
            <div key={e.id} className="paper-card p-6 md:p-8">
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-3xl text-clay">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-serif text-3xl">{e.name}</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                {e.event_date && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(e.event_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}{e.event_time ? ` · ${e.event_time.slice(0,5)}` : ""}</span>}
                {(e.venue_name || e.city) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[e.venue_name, e.city].filter(Boolean).join(", ")}</span>}
              </div>
              {e.description && <p className="mt-4 text-sm text-ink/70">{e.description}</p>}
            </div>
          ))}
          {events.length === 0 && <p className="text-center text-sm text-muted-foreground">Details coming soon.</p>}
        </div>
      </section>

      <footer className="border-t border-line py-6 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-clay" /> Made with Vowzy
        </div>
      </footer>
    </div>
  );
}
