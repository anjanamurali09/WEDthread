import type { Template } from "@/lib/website-templates";

/**
 * Visual preview thumbnail for a website template. Each `layout` renders a
 * genuinely different composition — arches, banners, split, monogram crest,
 * editorial grid, gradient, dark cinematic, polaroids, framed floral — not
 * just a colour swap. Everything is CSS/SVG so it stays crisp at any size.
 */
export function TemplatePreview({ t, names }: { t: Template; names: { a: string; b: string } }) {
  const { palette, fonts, layout } = t;
  const display: React.CSSProperties = { fontFamily: `"${fonts.display}", serif` };
  const A = names.a || "Partner 1";
  const B = names.b || "Partner 2";

  const box = "aspect-[4/3] w-full overflow-hidden relative";

  switch (layout) {
    case "arch":
      return (
        <div className={box} style={{ background: palette.soft }}>
          <div className="absolute inset-3 rounded-t-[999px] flex flex-col items-center justify-center px-3 text-center"
               style={{ background: palette.bg, color: palette.ink }}>
            <p className="text-[8px] tracking-[0.4em] uppercase" style={{ color: palette.accent }}>together</p>
            <p className="mt-2 leading-none" style={{ ...display, fontSize: 20 }}>{A}</p>
            <p className="italic text-sm my-0.5" style={{ color: palette.accent, ...display }}>&</p>
            <p className="leading-none" style={{ ...display, fontSize: 20 }}>{B}</p>
            <p className="mt-2 text-[8px] opacity-70">Dubai · Nov 2026</p>
          </div>
        </div>
      );

    case "split":
      return (
        <div className={`${box} flex`}>
          <div className="w-1/2 p-4 flex flex-col justify-between" style={{ background: palette.bg, color: palette.ink }}>
            <p className="text-[8px] tracking-[0.35em] uppercase" style={{ color: palette.accent }}>Saturday · 11.14.26</p>
            <div>
              <p style={{ ...display, fontSize: 22, lineHeight: 1 }}>{A}</p>
              <p style={{ ...display, fontSize: 22, lineHeight: 1 }}>&amp; {B}</p>
            </div>
            <p className="text-[8px] opacity-70">Palm Jumeirah, Dubai</p>
          </div>
          <div className="w-1/2" style={{ background: palette.soft }}>
            <div className="h-full w-full" style={{ background: `repeating-linear-gradient(45deg, ${palette.accent}22 0 6px, transparent 6px 14px), ${palette.soft}` }} />
          </div>
        </div>
      );

    case "banner":
      return (
        <div className={box} style={{ background: palette.soft }}>
          <div className="absolute top-0 inset-x-0 h-1/2" style={{ background: palette.bg }} />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <p className="text-[8px] tracking-[0.4em] uppercase" style={{ color: palette.ink, opacity: 0.7 }}>save the date</p>
            <p style={{ ...display, fontSize: 26, color: palette.ink, lineHeight: 1 }}>{A}<span style={{ color: palette.accent }}> &amp; </span>{B}</p>
            <div className="mt-2 px-3 py-1 rounded-full text-[10px]" style={{ background: palette.accent, color: palette.bg }}>Nov · 14 · 2026</div>
          </div>
        </div>
      );

    case "stack":
      return (
        <div className={`${box} p-4 flex flex-col justify-center items-center text-center`} style={{ background: palette.bg, color: palette.ink }}>
          <p className="text-[8px] tracking-[0.4em] uppercase" style={{ color: palette.accent }}>the wedding of</p>
          <p className="mt-3" style={{ ...display, fontSize: 22 }}>{A}</p>
          <p className="italic" style={{ ...display, color: palette.accent, fontSize: 14 }}>and</p>
          <p style={{ ...display, fontSize: 22 }}>{B}</p>
          <div className="mt-3 flex gap-1">
            <span className="h-1.5 w-8 rounded-full" style={{ background: palette.accent }} />
            <span className="h-1.5 w-4 rounded-full" style={{ background: palette.soft }} />
            <span className="h-1.5 w-8 rounded-full" style={{ background: palette.accent }} />
          </div>
        </div>
      );

    case "frame":
      return (
        <div className={box} style={{ background: palette.accent }}>
          <div className="absolute inset-4 flex flex-col items-center justify-center text-center p-3" style={{ background: palette.bg, color: palette.ink, borderRadius: 4 }}>
            <div className="text-[8px] tracking-[0.4em] uppercase" style={{ color: palette.accent }}>· est. 2026 ·</div>
            <p className="mt-2" style={{ ...display, fontSize: 20 }}>{A}</p>
            <p className="italic text-sm" style={{ color: palette.accent, ...display }}>&</p>
            <p style={{ ...display, fontSize: 20 }}>{B}</p>
          </div>
          {/* corner florals */}
          <div className="absolute top-1 left-1 h-4 w-4 rounded-full" style={{ background: palette.soft }} />
          <div className="absolute bottom-1 right-1 h-4 w-4 rounded-full" style={{ background: palette.soft }} />
        </div>
      );

    case "gradient":
      return (
        <div className={`${box} flex flex-col items-center justify-center text-center px-3`}
             style={{ background: `linear-gradient(135deg, ${palette.bg} 0%, ${palette.soft} 60%, ${palette.accent} 100%)`, color: palette.ink }}>
          <p className="text-[8px] tracking-[0.4em] uppercase opacity-80">forever begins</p>
          <p className="mt-2" style={{ ...display, fontSize: 26, lineHeight: 1 }}>{A}</p>
          <p className="italic" style={{ ...display, fontSize: 16, color: palette.accent }}>&</p>
          <p style={{ ...display, fontSize: 26, lineHeight: 1 }}>{B}</p>
        </div>
      );

    case "dark":
      return (
        <div className={`${box} flex items-end`} style={{ background: `radial-gradient(circle at 50% 30%, ${palette.soft} 0%, ${palette.bg} 70%)`, color: palette.ink }}>
          <div className="p-4 w-full text-center">
            <p className="text-[8px] tracking-[0.4em] uppercase" style={{ color: palette.accent }}>· mmxxvi ·</p>
            <p className="mt-1" style={{ ...display, fontSize: 22 }}>{A} <span style={{ color: palette.accent }}>·</span> {B}</p>
            <div className="mt-2 mx-auto h-px w-16" style={{ background: palette.accent }} />
            <p className="mt-2 text-[8px] opacity-70">A cinematic celebration</p>
          </div>
        </div>
      );

    case "editorial":
      return (
        <div className={`${box} grid grid-cols-3 gap-1 p-1`} style={{ background: palette.bg }}>
          <div className="col-span-2 row-span-2 p-3 flex flex-col justify-end" style={{ background: palette.soft, color: palette.ink }}>
            <p className="text-[8px] tracking-[0.35em] uppercase" style={{ color: palette.accent }}>issue nº 01</p>
            <p style={{ ...display, fontSize: 22, lineHeight: 0.95 }}>{A}<br/>&amp; {B}</p>
          </div>
          <div style={{ background: palette.accent }} />
          <div style={{ background: palette.ink, opacity: 0.7 }} />
        </div>
      );

    case "monogram":
      return (
        <div className={`${box} flex flex-col items-center justify-center text-center`} style={{ background: palette.bg, color: palette.ink }}>
          <div className="h-16 w-16 rounded-full border grid place-items-center" style={{ borderColor: palette.accent }}>
            <p style={{ ...display, color: palette.accent, fontSize: 22 }}>{(A[0] ?? "A")}<span className="opacity-40">·</span>{(B[0] ?? "B")}</p>
          </div>
          <p className="mt-3 text-[8px] tracking-[0.4em] uppercase" style={{ color: palette.accent }}>the {A.split(" ").pop()} · {B.split(" ").pop()} wedding</p>
          <p className="mt-1 text-[8px] opacity-70">November · 14 · 2026</p>
        </div>
      );

    case "polaroid":
      return (
        <div className={`${box} flex items-center justify-center gap-2 p-3`} style={{ background: palette.soft }}>
          <div className="h-24 w-20 -rotate-6 p-1.5 bg-white shadow flex flex-col">
            <div className="flex-1" style={{ background: palette.accent }} />
            <p className="text-[8px] text-center mt-1" style={{ ...display, color: palette.ink }}>{A}</p>
          </div>
          <div className="h-24 w-20 rotate-3 p-1.5 bg-white shadow flex flex-col">
            <div className="flex-1" style={{ background: palette.bg }} />
            <p className="text-[8px] text-center mt-1" style={{ ...display, color: palette.ink }}>{B}</p>
          </div>
        </div>
      );
  }
}
