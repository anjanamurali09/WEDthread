import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEvents } from "@/lib/wedding-hooks";
import { SECTION_LIBRARY, type Template } from "@/lib/website-templates";
import { useGoogleFonts } from "@/lib/google-fonts";
import { SitePreview, StaticPreviewContext, type Section } from "@/routes/_authenticated/website_.edit";

const WIDTHS = { desktop: 1100, mobile: 390 };

// "62% 40%" -> the focal point the hero's photo crop is centred on.
function focalOf(pos?: string) {
  const m = pos?.match(/(\d+)%\s+(\d+)%/);
  return m ? { focalX: Number(m[1]), focalY: Number(m[2]) } : {};
}

// What a wedding starting on this template would get: its sections, with the template's sample
// photo standing in for the couple's own in the hero.
function seededSections(t: Template, weddingId: string): Section[] {
  return t.sections.map((type, i) => {
    const def = SECTION_LIBRARY.find((d) => d.type === type)?.defaultContent ?? {};
    return {
      id: `preview-${t.id}-${i}`,
      wedding_id: weddingId,
      section_type: type,
      sort_order: i,
      visible: true,
      content: type === "hero" ? { ...def, ...(t.heroLayout ? { imageLayout: t.heroLayout } : {}), ...(t.heroAlign ? { overlayAlign: t.heroAlign } : {}), ...focalOf(t.previewFocus) } : def,
      image_url: t.images?.[type] ?? (type === "hero" ? t.preview ?? null : null),
    };
  });
}

// A full, scrollable, real render of a template's website (the same components as the editor and
// the published site), shown before the couple commits to it. For the template they're already on
// it uses their own saved sections, colours and fonts.
export function TemplateSitePreview({ t, wedding, current, device, thumb = false }: { t: Template; wedding: any; current: boolean; device: "desktop" | "mobile"; thumb?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  const [innerH, setInnerH] = useState(1200);
  const [boxH, setBoxH] = useState(0);
  const { data: events = [] } = useEvents(wedding.id);
  const { data: saved = [] } = useQuery({
    queryKey: ["website-sections", wedding.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("website_sections").select("*").eq("wedding_id", wedding.id).order("sort_order");
      return (data ?? []) as Section[];
    },
  });

  const custom = current ? ((wedding.site_customization as any) ?? {}) : {};
  const palette = { ...t.palette, ...(custom.palette ?? {}) };
  const fonts = { ...t.fonts, ...(custom.fonts ?? {}) };
  // The couple's saved TEXT (and which sections they have, in what order) shows in EVERY template's
  // preview. Photos do not: each template keeps its own sample photos, so you can judge the design.
  // Before they've saved anything, a template's own sample content stands in.
  const mine = saved.filter((s) => s.visible);
  const sections: Section[] = mine.length === 0 ? seededSections(t, wedding.id).filter((s) => s.visible)
    : current ? mine
    : mine.map((s) => {
        const { media, images, focalX, focalY, ...text } = s.content ?? {};
        void media; void images; void focalX; void focalY;
        const sample = t.images?.[s.section_type] ?? (s.section_type === "hero" ? t.preview ?? null : null);
        return {
          ...s,
          image_url: sample,
          content: s.section_type === "hero"
            ? { ...text, ...(t.heroLayout ? { imageLayout: t.heroLayout } : {}), ...(t.heroAlign ? { overlayAlign: t.heroAlign } : {}), ...focalOf(t.previewFocus) }
            : text,
        };
      });
  const pageLayout = (current ? custom.pageLayout : undefined) ?? t.pageLayout ?? "scroll";
  useGoogleFonts([fonts.display, fonts.body, ...sections.map((s) => s.content?.fontFamily)]);

  const width = WIDTHS[device];
  useEffect(() => {
    const b = box.current, i = inner.current;
    if (!b || !i) return;
    const update = () => {
      setScale(Math.min(1, b.clientWidth / width));
      setInnerH(i.scrollHeight);
      setBoxH(b.clientHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(b); ro.observe(i);
    return () => ro.disconnect();
  }, [width, t.id]);

  // Gallery thumbnail: just the top of the real page, scaled down, not scrollable or clickable.
  if (thumb) {
    return (
      <div ref={box} className="relative aspect-[16/10] w-full overflow-hidden" style={{ background: palette.bg }} aria-hidden>
        <div ref={inner} className="pointer-events-none select-none origin-top-left" style={{ width, transform: `scale(${scale})` }}>
          <StaticPreviewContext.Provider value={{ vh: 700, compact: true }}>
            <SitePreview wedding={wedding} sections={sections} palette={palette} template={t} fonts={fonts}
              fontScale={custom.fontScale} pageLayout={pageLayout} events={events} background={custom.background} decoration={custom.decoration} />
          </StaticPreviewContext.Provider>
        </div>
      </div>
    );
  }

  // The scrollable panel is shrunk with CSS `zoom`, not a transform: a transform scales the picture but
  // not the layout, which makes position:sticky (the pinned cover photo) drift as you scroll.
  return (
    <div ref={box} className="h-full w-full overflow-y-auto" style={{ background: palette.bg }}>
      <div ref={inner} className="select-none" style={{ width, zoom: scale, margin: "0 auto" } as React.CSSProperties}>
        {/* "One screen" in the big preview is the panel's own visible height (in page pixels), so the cover
            photo fills the panel and stays put while the text scrolls past, continuing through the next section. */}
        <StaticPreviewContext.Provider value={{ vh: boxH > 0 ? Math.round(boxH / scale) : device === "mobile" ? 760 : 700, mobile: device === "mobile" }}>
          <SitePreview wedding={wedding} sections={sections} palette={palette} template={t} fonts={fonts}
            fontScale={custom.fontScale} pageLayout={pageLayout} events={events} background={custom.background} decoration={custom.decoration} />
        </StaticPreviewContext.Provider>
      </div>
    </div>
  );
}
