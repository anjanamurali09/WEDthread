import { useEffect, useMemo, useState } from "react";

// Text that sizes itself to the shape it sits in. The size is the largest one (up to `max`) at which the text,
// wrapped onto as many lines as it needs, fits the box, and it never drops below `min` so it stays readable. It is
// never cut off with "...": if even the smallest size does not fit, it simply runs a little past the shape.

let ctx: CanvasRenderingContext2D | null | undefined;
function measure(text: string, size: number, weight: number, spacingEm: number): number {
  if (ctx === undefined) ctx = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  if (!ctx) return text.length * size * 0.62;
  ctx.font = `${weight} ${size}px Poppins, system-ui, sans-serif`;
  return ctx.measureText(text).width + text.length * spacingEm * size;
}

function wrap(text: string, boxW: number, size: number, weight: number, spacingEm: number, allowOverflow: boolean): string[] | null {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (!allowOverflow && measure(w, size, weight, spacingEm) > boxW) return null;
    const next = line ? `${line} ${w}` : w;
    if (line && measure(next, size, weight, spacingEm) > boxW) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function fitText(text: string, boxW: number, boxH: number, o: { max: number; min: number; weight?: number; spacingEm?: number }) {
  const weight = o.weight ?? 500, spacingEm = o.spacingEm ?? 0;
  for (let size = Math.round(o.max); size >= o.min; size--) {
    const lines = wrap(text, boxW, size, weight, spacingEm, false);
    if (lines && lines.length * size * 1.15 <= boxH) return { size, lines };
  }
  return { size: o.min, lines: wrap(text, boxW, o.min, weight, spacingEm, true) ?? [text] };
}

// Re-measure once the web fonts have loaded, since the first measurement may use a fallback font.
function useFontsReady() {
  const [n, setN] = useState(0);
  useEffect(() => { document.fonts?.ready.then(() => setN((v) => v + 1)); }, []);
  return n;
}

export function FitLabel({ text, boxW, boxH, max, min = 10, weight = 500, spacingEm = 0, uppercase = false, className, style }: {
  text: string; boxW: number; boxH: number; max: number; min?: number; weight?: number; spacingEm?: number; uppercase?: boolean;
  className?: string; style?: React.CSSProperties;
}) {
  const fonts = useFontsReady();
  const shown = uppercase ? text.toUpperCase() : text;
  const fit = useMemo(() => fitText(shown, Math.max(10, boxW), Math.max(10, boxH), { max, min, weight, spacingEm }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, Math.round(boxW), Math.round(boxH), max, min, weight, spacingEm, fonts]);
  return (
    <span className={className} style={{ display: "block", fontSize: fit.size, lineHeight: 1.15, fontWeight: weight, letterSpacing: spacingEm ? `${spacingEm}em` : undefined, whiteSpace: "nowrap", textAlign: "center", ...style }}>
      {fit.lines.map((l, i) => <span key={i} style={{ display: "block" }}>{l}</span>)}
    </span>
  );
}

// Holds text in a frame the size of the shape, turned by `rotation` degrees (0, 90, 180 or 270). A quarter turn swaps
// the frame's width and height, so text on its side still fills the shape lengthways. Children get the box to fit to.
export function TextFrame({ width, height, rotation = 0, children }: {
  width: number; height: number; rotation?: number; children: (box: { w: number; h: number }) => React.ReactNode;
}) {
  const turned = rotation % 180 !== 0;
  const w = turned ? height : width, h = turned ? width : height;
  return (
    <div aria-hidden={false} style={{ position: "absolute", left: "50%", top: "50%", width: w, height: h, transform: `translate(-50%, -50%) rotate(${rotation}deg)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
      {children({ w, h })}
    </div>
  );
}
