import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, MapPin, CalendarDays } from "lucide-react";
import { getTemplate } from "@/lib/website-templates";
import { RenderSection } from "./_authenticated/website_.edit";

export const Route = createFileRoute("/w/$slug")({ component: WeddingSite });

function WeddingSite() {
  const { slug } = Route.useParams();
  const [wedding, setWedding] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: w } = await supabase.from("weddings").select("*").eq("slug", slug).eq("site_published", true).maybeSingle();
      if (!w) { setLoading(false); return; }
      setWedding(w);
      const [{ data: ev }, { data: secs }] = await Promise.all([
        supabase.from("events").select("*").eq("wedding_id", w.id).order("event_date"),
        (supabase as any).from("website_sections").select("*").eq("wedding_id", w.id).eq("visible", true).order("sort_order"),
      ]);
      setEvents(ev ?? []);
      setSections(secs ?? []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-pearl"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!wedding) return (
    <div className="min-h-screen grid place-items-center bg-pearl text-center px-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-cherry">Not found</p>
        <h1 className="mt-2 font-serif text-3xl">This wedding site isn't published yet</h1>
      </div>
    </div>
  );

  const template = getTemplate(wedding.site_template_id);
  const palette = { ...template.palette, ...((wedding.site_customization as any)?.palette ?? {}) };

  // If no sections were seeded, fall back to a basic hero + events render
  const hasSections = sections.length > 0;

  return (
    <div className="min-h-screen" style={{ background: palette.bg, color: palette.ink, fontFamily: `"${template.fonts.body}", sans-serif` }}>
      {hasSections ? (
        sections.map((s) => {
          if (s.section_type === "events") {
            return (
              <section key={s.id} className="max-w-3xl mx-auto px-6 py-16">
                <p className="text-center text-[11px] uppercase tracking-[0.25em]" style={{ color: palette.accent }}>{s.content?.title || "The celebrations"}</p>
                <div className="mt-10 space-y-4">
                  {events.map((e, i) => (
                    <div key={e.id} className="rounded-3xl p-6 md:p-8" style={{ background: palette.soft }}>
                      <div className="flex items-baseline gap-4">
                        <span className="font-serif text-3xl" style={{ color: palette.accent, fontFamily: `"${template.fonts.display}", serif` }}>{String(i + 1).padStart(2, "0")}</span>
                        <h3 className="text-3xl" style={{ fontFamily: `"${template.fonts.display}", serif` }}>{e.name}</h3>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm opacity-70">
                        {e.event_date && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(e.event_date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}{e.event_time ? ` · ${e.event_time.slice(0,5)}` : ""}</span>}
                        {(e.venue_name || e.city) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {[e.venue_name, e.city].filter(Boolean).join(", ")}</span>}
                      </div>
                      {e.description && <p className="mt-4 text-sm opacity-75">{e.description}</p>}
                    </div>
                  ))}
                  {events.length === 0 && <p className="text-center text-sm opacity-60">Details coming soon.</p>}
                </div>
              </section>
            );
          }
          return <RenderSection key={s.id} section={s} palette={palette} template={template} wedding={wedding} />;
        })
      ) : (
        <section className="min-h-[92vh] flex flex-col items-center justify-center text-center px-6">
          <p className="text-[11px] uppercase tracking-[0.35em]" style={{ color: palette.accent }}>Together with their families</p>
          <h1 className="mt-8" style={{ fontFamily: `"${template.fonts.display}", serif`, fontSize: "clamp(3rem, 8vw, 6rem)", lineHeight: 0.95 }}>
            {wedding.partner_a}<br /><span style={{ color: palette.accent }}>&</span><br />{wedding.partner_b}
          </h1>
        </section>
      )}

      <footer className="border-t py-6 text-center" style={{ borderColor: palette.soft }}>
        <div className="inline-flex items-center gap-2 text-xs opacity-60">
          <Sparkles className="h-3 w-3" style={{ color: palette.accent }} /> Made with Vowzy
        </div>
      </footer>
    </div>
  );
}
