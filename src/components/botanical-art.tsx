import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Self-drawn botanical illustrations (leaves, line-art blooms, olive sprigs) used as optional
// decoration on wedding websites. Everything is generated from a few small shapes so it stays
// crisp at any size and tints to the site's own colours.

export type DecorKind = "greenery" | "blooms" | "branch" | "daisy" | "wildflower" | "umbel" | "sprig";
export const DECOR_OPTIONS: { value: DecorKind; label: string }[] = [
  { value: "greenery", label: "Greenery" },
  { value: "blooms", label: "Blooms" },
  { value: "branch", label: "Twig & blossom" },
  { value: "daisy", label: "Daisy" },
  { value: "wildflower", label: "Wildflower" },
  { value: "umbel", label: "Wild carrot" },
  { value: "sprig", label: "Leafy sprig" },
];

// Hand-drawn line illustrations supplied as images (public/templates/art/*.png, transparent with
// dark strokes). They're used as a CSS mask so they take on whatever colour the site wants.
export const IMAGE_DECOR: Partial<Record<DecorKind, { src: string; ratio: number }>> = {
  branch: { src: "/templates/art/branch.png", ratio: 512 / 926 },
  daisy: { src: "/templates/art/daisy.png", ratio: 412 / 354 },
  wildflower: { src: "/templates/art/wildflower.png", ratio: 296 / 690 },
  umbel: { src: "/templates/art/umbel.png", ratio: 272 / 662 },
  sprig: { src: "/templates/art/sprig.png", ratio: 218 / 316 },
};

export function ImageArt({ kind, color, className, style }: { kind: DecorKind; color: string; className?: string; style?: React.CSSProperties }) {
  const art = IMAGE_DECOR[kind];
  if (!art) return null;
  return (
    <div aria-hidden className={className} style={{
      aspectRatio: String(art.ratio), backgroundColor: color,
      WebkitMaskImage: `url(${art.src})`, maskImage: `url(${art.src})`,
      WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
      WebkitMaskPosition: "center", maskPosition: "center", ...style,
    }} />
  );
}

// A leaf of length L and width W, pointing up from the origin.
const leafPath = (L: number, W: number) =>
  `M0 0 C ${W} ${-L * 0.25}, ${W * 0.85} ${-L * 0.8}, 0 ${-L} C ${-W * 0.85} ${-L * 0.8}, ${-W} ${-L * 0.25}, 0 0Z`;

type StemProps = {
  x: number; y: number; angle: number; len: number;
  leaf: number; step?: number; spread?: number;
  colors: string[]; mode?: "fill" | "line"; opacity?: number; tip?: boolean;
};

// A straight stem (0° points up) with leaves in alternating pairs that shrink toward the tip.
function Stem({ x, y, angle, len, leaf, step = 16, spread = 42, colors, mode = "fill", opacity = 0.9, tip = true }: StemProps) {
  const leaves: React.ReactNode[] = [];
  let i = 0;
  for (let d = step; d <= len - step * 0.5; d += step, i++) {
    const k = 1 - (d / len) * 0.45;
    const L = leaf * k, W = leaf * 0.36 * k;
    const c = colors[i % colors.length];
    [-1, 1].forEach((side) => {
      const props = mode === "fill"
        ? { fill: c, opacity }
        : { fill: "none", stroke: c, strokeWidth: 1, opacity };
      leaves.push(
        <g key={`${i}${side}`} transform={`translate(0 ${-d}) rotate(${side * spread})`}>
          <path d={leafPath(L, W)} {...props} />
          {mode === "line" && <path d={`M0 0 L0 ${-L * 0.9}`} stroke={c} strokeWidth="0.6" opacity={opacity} />}
        </g>,
      );
    });
  }
  const stemColor = colors[0];
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={`M0 0 L0 ${-len}`} stroke={stemColor} strokeWidth={mode === "fill" ? 1.4 : 1} opacity={opacity} />
      {leaves}
      {tip && <path d={leafPath(leaf * 0.7, leaf * 0.26)} transform={`translate(0 ${-len})`} {...(mode === "fill" ? { fill: colors[0], opacity } : { fill: "none", stroke: colors[0], strokeWidth: 1, opacity })} />}
    </g>
  );
}

// Layered petals around a centre. `fills` go outer ring -> inner ring.
function Flower({ cx, cy, r, fills, centre, mode = "fill", stroke }: { cx: number; cy: number; r: number; fills: string[]; centre?: string; mode?: "fill" | "line"; stroke?: string }) {
  const rings = fills.length;
  return (
    <g transform={`translate(${cx} ${cy})`}>
      {fills.map((f, ri) => {
        const rr = r * (1 - ri * (0.7 / rings));
        const n = 7 + ri;
        return Array.from({ length: n }, (_, i) => (
          <path key={`${ri}-${i}`} d={leafPath(rr, rr * 0.5)} transform={`rotate(${(360 / n) * i + ri * 17})`}
            {...(mode === "fill" ? { fill: f, opacity: 0.8 } : { fill: "none", stroke: stroke ?? f, strokeWidth: 0.9, opacity: 0.9 })} />
        ));
      })}
      {centre && Array.from({ length: 9 }, (_, i) => (
        <circle key={i} cx={Math.cos(i * 2.4) * r * 0.12 * (i % 3)} cy={Math.sin(i * 2.4) * r * 0.12 * (i % 3)} r={r * 0.045} fill={centre} />
      ))}
    </g>
  );
}

const GREENS = ["#5C8467", "#7FA38A", "#4A6F58", "#93B49A"];

/** viewBox 200x200, drawn growing in from the top-right corner. */
function Greenery() {
  return (
    <g>
      <Stem x={205} y={-5} angle={-148} len={150} leaf={26} step={14} colors={GREENS} />
      <Stem x={205} y={-5} angle={-122} len={120} leaf={22} step={13} colors={[GREENS[1], GREENS[0], GREENS[3]]} />
      <Stem x={205} y={-5} angle={-170} len={105} leaf={20} step={12} colors={[GREENS[2], GREENS[1]]} />
      <Stem x={205} y={30} angle={-135} len={80} leaf={16} step={11} colors={[GREENS[3], GREENS[0]]} />
    </g>
  );
}

function Blooms() {
  return (
    <g>
      <Stem x={205} y={40} angle={-130} len={120} leaf={24} step={16} colors={["#6E9B72", "#5C8467"]} />
      <Flower cx={150} cy={52} r={44} fills={["#7B1E3A", "#9E2B4B", "#C24A66"]} centre="#F2C14E" />
      <Flower cx={190} cy={116} r={30} fills={["#F2B8C0", "#F6CDD2", "#FBE3E5"]} centre="#F2C14E" />
      <Flower cx={96} cy={88} r={24} fills={["#C24A66", "#D96C84"]} centre="#F2C14E" />
    </g>
  );
}

export function BotanicalArt({ kind, className, style, color = "#4a4a4a" }: { kind: DecorKind; className?: string; style?: React.CSSProperties; color?: string }) {
  if (IMAGE_DECOR[kind]) return <ImageArt kind={kind} color={color} className={className} style={style} />;
  return (
    <svg viewBox="0 0 200 200" className={className} style={style} fill="none" aria-hidden>
      {kind === "greenery" && <Greenery />}
      {kind === "blooms" && <Blooms />}
    </svg>
  );
}

// The decoration layer for a whole page, behind everything. The page wrapper needs `relative isolate`.
// It starts BELOW the cover so a full-bleed photo never hides or crops it: under the cover photo for
// the "photo on top" cover (in the empty text area), otherwise under the hero. With a photo-left cover
// the art moves to the right side, since the left is the photo.
export function SiteDecor({ kind, color, heroLayout }: { kind?: DecorKind | null; color?: string; heroLayout?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const wrap = ref.current?.parentElement;
    if (!wrap || !kind) return;
    const measure = () => {
      const el = (heroLayout === "top" ? wrap.querySelector("[data-decor-top]") : null) ?? wrap.querySelector("section");
      if (!(el instanceof HTMLElement)) { setTop(0); return; }
      let y = 0;
      let n: HTMLElement | null = el;
      while (n && n !== wrap) { y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
      setTop(y + el.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [kind, heroLayout]);

  if (!kind) return null;
  const tint = color ?? "#4a4a4a";
  const mirror = heroLayout === "left"; // photo on the left, so the art goes to the right
  const side = (left: string, right: string) => (mirror ? right : left);
  const flipX = (f: string) => (mirror ? (f === "none" ? "scaleX(-1)" : `scaleX(-1) ${f}`) : f);

  const frame = (children: React.ReactNode) => (
    <div ref={ref} aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 overflow-hidden" style={{ top }}>{children}</div>
  );

  // Image-based line drawings. A stem's cut end is never left showing: pieces either grow in from the
  // page edge (the stem's base sits on the edge and is cropped by it, the flowers leaning into the page)
  // or stand on the bottom edge with their base cropped by it.
  if (IMAGE_DECOR[kind]) {
    const h = "clamp(200px, 30vw, 440px)";
    const small = "clamp(150px, 22vw, 300px)";
    const tall = kind === "wildflower" || kind === "umbel";
    // A piece whose base is centred on the left/right page edge and leans inward.
    const edge = (at: "left" | "right", top: string, height: string, lean: number) => (
      <ImageArt kind={kind} color={tint} className={cn("absolute", at === "right" ? "right-0" : "left-0")}
        style={{ top, height, transformOrigin: "50% 100%", opacity: 0.9,
          transform: at === "right" ? `translateX(50%) rotate(${-lean}deg)` : `translateX(-50%) rotate(${lean}deg) scaleX(-1)` }} />
    );
    // A piece standing on the bottom of the page, its base below the edge.
    const floor = (at: "left" | "right", height: string, mirrorIt = false) => (
      <ImageArt kind={kind} color={tint} className={cn("absolute bottom-0", at === "right" ? "right-[3%]" : "left-[3%]")}
        style={{ height, transform: `translateY(8%)${mirrorIt ? " scaleX(-1)" : ""}`, opacity: 0.9 }} />
    );
    // With no cover photo the opening screen is plain text, so one piece also grows in beside the names.
    const heroPiece = !heroLayout && top > 120 ? (
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden" style={{ height: top }}>
        <ImageArt kind={kind} color={tint} className={cn("absolute", side("left-0", "right-0"))}
          style={{ top: 28, height: `min(${Math.max(top - 70, 120)}px, 360px)`, transformOrigin: "50% 100%", opacity: 0.9,
            transform: kind === "daisy" ? "rotate(-12deg)" : mirror ? `translateX(50%) rotate(${tall ? -18 : -50}deg)` : `translateX(-50%) rotate(${tall ? 18 : 50}deg) scaleX(-1)` }} />
      </div>
    ) : null;
    return (<>{heroPiece}{frame(
      kind === "daisy" ? (
        <>
          <ImageArt kind={kind} color={tint} className={cn("absolute top-4", side("right-[2%]", "right-[2%]"))} style={{ height: "clamp(150px, 24vw, 320px)", transform: "rotate(14deg)", opacity: 0.9 }} />
          <ImageArt kind={kind} color={tint} className={cn("absolute bottom-4", mirror ? "right-[30%]" : "left-[2%]")} style={{ height: "clamp(150px, 24vw, 320px)", transform: "rotate(194deg)", opacity: 0.9 }} />
        </>
      ) : tall ? (
        edge(mirror ? "right" : "left", "24px", h, 18)
      ) : (
        <>
          {edge("right", "24px", h, 52)}
          {floor(mirror ? "right" : "left", small, !mirror)}
        </>
      ),
    )}</>);
  }

  const size = "clamp(120px, 24%, 300px)";
  const art = (pos: string, flip: string) => (
    <BotanicalArt kind={kind} className={cn("absolute", pos)} style={{ width: size, aspectRatio: "1", transform: flip, opacity: 1 }} />
  );
  return frame(
    (
      <>
        {art(`${side("right-0", "left-0")} top-0`, flipX("none"))}
        {art(`${side("left-0", "right-0")} bottom-0`, flipX("rotate(180deg)"))}
      </>
    ),
  );
}
