import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getTemplate } from "@/lib/website-templates";
import { SiteShell, SiteFooter, SiteBackdrop, decorFor, heroCoverOf, type PageLayout } from "./_authenticated/website_.edit";
import { SiteDecor } from "@/components/botanical-art";
import { useGoogleFonts } from "@/lib/google-fonts";

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

  // Hooks must run unconditionally, so this is computed before the loading/not-found
  // early returns below rather than after them — same reason it can't be skipped when
  // `wedding` is still null.
  const custom = (wedding?.site_customization as any) ?? {};
  const template = getTemplate(wedding?.site_template_id);
  const palette = { ...template.palette, ...(custom.palette ?? {}) };
  const effectiveTemplate = { ...template, fonts: { ...template.fonts, ...(custom.fonts ?? {}) } };
  const fontScale = custom.fontScale ?? 1;
  const pageLayout: PageLayout = custom.pageLayout ?? template.pageLayout ?? "scroll";

  // Only load fonts this wedding's site actually uses — the sitewide pair plus any
  // per-section overrides — not the whole curated font list.
  useGoogleFonts([effectiveTemplate.fonts.display, effectiveTemplate.fonts.body, ...sections.map((s) => s.content?.fontFamily)]);

  if (loading) return <div className="min-h-screen grid place-items-center bg-pearl"><p className="text-sm text-muted-foreground">Loading…</p></div>;
  if (!wedding) return (
    <div className="min-h-screen grid place-items-center bg-pearl text-center px-6">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-cherry">Not found</p>
        <h1 className="mt-2 font-serif text-3xl">This wedding site isn't published yet</h1>
      </div>
    </div>
  );

  // If no sections were seeded, fall back to a basic hero + events render
  const hasSections = sections.length > 0;

  return (
    <div className="@container min-h-screen relative isolate" style={{ ["--screen" as any]: "100svh", background: palette.bg, color: palette.ink, fontFamily: `"${effectiveTemplate.fonts.body}", sans-serif`, ["--site-scale" as any]: fontScale }}>
      <SiteBackdrop bg={custom.background} />
      <SiteDecor kind={decorFor(template, custom.decoration)} color={palette.accent} heroLayout={heroCoverOf(sections)} />
      {hasSections ? (
        <SiteShell wedding={wedding} sections={sections} palette={palette} template={effectiveTemplate} events={events} layoutMode={pageLayout} />
      ) : (
        <section className="min-h-[92vh] flex flex-col items-center justify-center text-center px-6">
          <p className="text-sm uppercase tracking-[0.35em]" style={{ color: palette.accent }}>Together with their families</p>
          <h1 className="mt-8" style={{ fontFamily: `"${effectiveTemplate.fonts.display}", serif`, fontSize: "calc(clamp(3rem, 8vw, 6rem) * var(--site-scale, 1))", lineHeight: 0.95 }}>
            {wedding.partner_a}<br /><span style={{ color: palette.accent }}>&</span><br />{wedding.partner_b}
          </h1>
        </section>
      )}

      <SiteFooter palette={palette} />
    </div>
  );
}
