import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { cn, formatNumber } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { summarizeGuestRsvps } from "@/lib/rsvp-stats";
import type { Event, Guest, Invite } from "@/lib/wedding-hooks";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";

type WTable = { id: string; event_id: string; seats: number };
type SeatAssignment = { id: string; table_id: string };

// sizeScale is a continuous 0.75-1.35 multiplier (bigger events → bigger card;
// Venue/Vendors deliberately small since they're plain navigational links, not
// per-wedding data) — not the app's discrete text-size scale, since it has to
// track a continuous guest count rather than a handful of named sizes.
type MindmapNode = { key: string; title: string; lines: string[]; to: string; sizeScale: number };

// One shared prop shape for the layout components — assembled once by the
// exported component so both the radial (desktop) and stacked (mobile) views
// render the exact same data.
type MindmapProps = {
  wedding: {
    id: string; partner_a: string; partner_b: string; couple_photo_url: string | null;
    couple_photo_zoom: number | null; couple_photo_pan_x: number | null; couple_photo_pan_y: number | null;
    budget_limit: number | null; budget_currency: string | null;
  };
  events: Event[];
  guests: Guest[];
  invites: Invite[];
  tables: WTable[];
  seatAssignments: SeatAssignment[];
  budgetSpent: number;
  onUploadPhoto: (file: File) => void;
  onCropChange: (zoom: number, panX: number, panY: number) => void;
};

function buildNodes({ wedding, events, guests, invites, tables, seatAssignments, budgetSpent }: MindmapProps): MindmapNode[] {
  const guestIds = guests.map((g) => g.id);
  const currency = wedding.budget_currency ?? "USD";
  const money = (n: number) => formatMoney(n, currency);

  const eventStats = events.map((e) => ({ event: e, ...summarizeGuestRsvps(guestIds, invites, e.id) }));
  const maxAttending = Math.max(1, ...eventStats.map((s) => s.attending));

  const eventNodes: MindmapNode[] = eventStats.map(({ event: e, invited, attending }) => {
    const lines = [
      e.event_date ? new Date(e.event_date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "Date TBD",
      `${formatNumber(attending)} of ${formatNumber(invited)} attending`,
    ];
    if (e.enabled_categories?.includes("seating")) {
      const eventTables = tables.filter((t) => t.event_id === e.id);
      const tableIds = new Set(eventTables.map((t) => t.id));
      const capacity = eventTables.reduce((sum, t) => sum + t.seats, 0);
      const seated = seatAssignments.filter((s) => tableIds.has(s.table_id)).length;
      if (capacity > 0) lines.push(`${formatNumber(seated)} of ${formatNumber(capacity)} seated`);
    }
    return { key: e.id, title: e.name, lines, to: "/events", sizeScale: 0.9 + (attending / maxAttending) * 0.45 };
  });

  // Wedding-wide, one node each — not per event, since most couples don't split
  // vendors, venue, budget, or RSVP by event the way they do the guest list.
  const { invited: totalInvited, attending: totalAttending } = summarizeGuestRsvps(guestIds, invites);
  const singularNodes: MindmapNode[] = [
    { key: "venue", title: "Venue", lines: ["Browse venues"], to: "/venues", sizeScale: 0.78 },
    { key: "vendors", title: "Vendors", lines: ["Browse vendors"], to: "/vendors", sizeScale: 0.78 },
    {
      key: "budget", title: "Budget",
      lines: [wedding.budget_limit != null ? `${money(budgetSpent)} of ${money(wedding.budget_limit)}` : `${money(budgetSpent)} spent`],
      to: "/budget", sizeScale: 1,
    },
    { key: "rsvp", title: "RSVP", lines: [`${formatNumber(totalAttending)} of ${formatNumber(totalInvited)} attending`], to: "/rsvp-questions", sizeScale: 1 },
  ];

  return [...eventNodes, ...singularNodes];
}

// Drag-to-pan + slider-to-zoom photo cropper, shown in a dialog. Renders the
// photo at a fixed preview size with object-fit:cover as the base crop, then
// layers a live translate+scale transform on top (translate outermost, so a
// screen-pixel drag tracks 1:1 regardless of zoom level). zoom/panX/panY are
// stored as-is (zoom a plain multiplier, pan as % of the image's own
// rendered box) so the exact same transform reproduces the crop at any
// actual display size, not just this dialog's preview.
function PhotoCropDialog({ src, zoom: initialZoom, panX: initialPanX, panY: initialPanY, onSave, onClose }: {
  src: string; zoom: number; panX: number; panY: number;
  onSave: (zoom: number, panX: number, panY: number) => void; onClose: () => void;
}) {
  const [zoom, setZoom] = useState(initialZoom);
  const [panX, setPanX] = useState(initialPanX);
  const [panY, setPanY] = useState(initialPanY);
  const frameRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);

  // At zoom 1 the cover-fit photo already exactly fills the frame on its
  // tighter axis with no spare margin, so any pan there would reveal empty
  // space — clamp grows only as zoom adds real overflow to pan into.
  const maxPan = (zoom - 1) * 50;
  const clamp = (v: number) => Math.min(maxPan, Math.max(-maxPan, v));

  return (
    <Dialog open onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust photo</DialogTitle>
        </DialogHeader>
        <div ref={frameRef}
          className="relative mx-auto h-64 w-64 rounded-full overflow-hidden border border-line cursor-grab active:cursor-grabbing touch-none select-none"
          onPointerDown={(e) => { draggingRef.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={(e) => {
            if (!draggingRef.current || !frameRef.current) return;
            const rect = frameRef.current.getBoundingClientRect();
            const dx = ((e.clientX - draggingRef.current.x) / rect.width) * 100;
            const dy = ((e.clientY - draggingRef.current.y) / rect.height) * 100;
            draggingRef.current = { x: e.clientX, y: e.clientY };
            setPanX((p) => clamp(p + dx));
            setPanY((p) => clamp(p + dy));
          }}
          onPointerUp={() => { draggingRef.current = null; }}>
          <img src={src} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{ transform: `translate(${panX}%, ${panY}%) scale(${zoom})` }} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground shrink-0">Zoom</span>
          <input type="range" min={1} max={3} step={0.02} value={zoom}
            onChange={(e) => { const z = Number(e.target.value); setZoom(z); const m = (z - 1) * 50; setPanX((p) => Math.min(m, Math.max(-m, p))); setPanY((p) => Math.min(m, Math.max(-m, p))); }}
            className="flex-1 accent-wine" />
          <button type="button" onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
            className="text-xs text-muted-foreground hover:text-ink underline cursor-pointer shrink-0">
            Reset
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Drag the photo to reposition it, or use the slider to zoom in.</p>
        <DialogFooter>
          <DialogClose asChild>
            <button type="button" className="text-sm text-muted-foreground hover:text-ink px-4 py-2 cursor-pointer">Cancel</button>
          </DialogClose>
          <button type="button" onClick={() => onSave(zoom, panX, panY)}
            className="rounded-full bg-ink text-pearl px-5 py-2 text-sm hover:bg-wine cursor-pointer">
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Before a photo is uploaded, the couple's names ARE the placeholder — three
// centered lines (name / & / name) in the middle of the circle, no icon, tap
// anywhere to upload. Once a photo exists, the names disappear entirely (the
// photo IS the content) and hovering reveals two explicit actions instead —
// Replace (swap the photo) and Crop (open the zoom/pan editor above).
function CenterPhoto({ photoUrl, nameA, nameB, zoom, panX, panY, onUpload, onCropChange, sizeClassName = "h-52 w-52" }: {
  photoUrl: string | null; nameA: string; nameB: string; zoom: number; panX: number; panY: number;
  onUpload: (file: File) => void; onCropChange: (zoom: number, panX: number, panY: number) => void; sizeClassName?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);

  return (
    <div className={cn("group relative rounded-full overflow-hidden shadow-lg shrink-0", sizeClassName)}>
      {photoUrl ? (
        <img src={photoUrl} alt={`${nameA} & ${nameB}`} className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: `translate(${panX}%, ${panY}%) scale(${zoom})` }} />
      ) : (
        <button type="button" onClick={() => fileRef.current?.click()} title="Upload photo" className="absolute inset-0 w-full h-full cursor-pointer">
          <div className="w-full h-full grid place-items-center warm-wash px-3">
            <div className="text-center leading-tight">
              <p className="font-sans font-bold text-wine text-xl">{nameA}</p>
              <p className="font-sans font-bold text-wine/70 text-base my-1">&amp;</p>
              <p className="font-sans font-bold text-wine text-xl">{nameB}</p>
            </div>
          </div>
          <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/60 transition-colors grid place-items-center">
            <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs uppercase tracking-widest text-pearl font-medium text-center px-2">
              Upload photo
            </span>
          </div>
        </button>
      )}

      {photoUrl && (
        <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/55 transition-colors opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="rounded-full bg-pearl/95 text-ink px-3 py-1.5 text-xs font-medium hover:bg-pearl cursor-pointer">
            Replace
          </button>
          <button type="button" onClick={() => setCropOpen(true)}
            className="rounded-full bg-pearl/95 text-ink px-3 py-1.5 text-xs font-medium hover:bg-pearl cursor-pointer">
            Crop
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />

      {cropOpen && photoUrl && (
        <PhotoCropDialog src={photoUrl} zoom={zoom} panX={panX} panY={panY}
          onSave={(z, x, y) => { onCropChange(z, x, y); setCropOpen(false); }}
          onClose={() => setCropOpen(false)} />
      )}
    </div>
  );
}

function NodeCard({ node, className, style }: { node: MindmapNode; className?: string; style?: React.CSSProperties }) {
  const scale = node.sizeScale;
  return (
    <Link
      to={node.to}
      className={cn("paper-card hover:shadow-md hover:-translate-y-0.5 transition-all", className)}
      style={{
        padding: `${14 + scale * 10}px ${18 + scale * 14}px`,
        // Tuned so Budget (sizeScale fixed at 1) gets ~350px — enough for its
        // longest line ("AED 700 of AED 150,000") on one row — while the
        // multiplier on sizeScale stays small, since that only reflects an
        // event's popularity, not how much text its card actually holds; a
        // steeper multiplier would blow the widest card out disproportionately.
        maxWidth: 265 + scale * 85,
        ...style,
      }}
    >
      <p className="font-semibold text-ink" style={{ fontSize: 16 + scale * 5 }}>{node.title}</p>
      {node.lines.map((l, i) => (
        <p key={i} className="text-muted-foreground mt-0.5" style={{ fontSize: 13 + scale * 3 }}>{l}</p>
      ))}
    </Link>
  );
}

// Deterministic pseudo-random in [0, 1) from a seed — gives every node a stable
// (not re-rolled on every render) radius/curve wobble without needing state.
function seededRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

// Cycled across legs so adjacent lines never repeat the same hue — pulled
// straight from the app's own navy/blue/yellow tokens (src/styles.css), not
// invented colors.
const LEG_COLORS = ["var(--wine)", "var(--cherry)", "var(--sage-deep)", "var(--cream-hover)"];

// A smooth, gently wavy line between two points — a single wide bow, not a
// multi-bump squiggle — that tapers to nothing at both ends (via the
// sin(pi*t) envelope) so it still meets the center dot and the card cleanly
// rather than arriving at an angle. Sampled points are threaded through a
// Catmull-Rom spline (converted to cubic beziers) rather than straight
// segments, so the curve itself stays smooth instead of jagged.
function squigglyPath(x0: number, y0: number, x1: number, y1: number, seed: number) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  const px = -uy, py = ux;
  const waves = 1;
  const amplitude = 16 + seededRandom(seed * 4.3) * 10;
  const phase = seededRandom(seed * 9.1) * Math.PI * 2;

  const steps = 20;
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const envelope = Math.sin(Math.PI * t);
    const offset = amplitude * envelope * Math.sin(t * waves * Math.PI * 2 + phase);
    points.push({ x: x0 + dx * t + px * offset, y: y0 + dy * t + py * offset });
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

// Layout constants for the left/right diagram below — pulled out so the
// width/height math reads as one coherent budget rather than magic numbers
// scattered through the component.
const CIRCLE_D = 208; // matches CenterPhoto's default h-52 w-52
const COL_GAP = 230; // horizontal room between the circle's edge and a side's cards, for the leg's curve
const CARD_W_BUDGET = 380; // clears NodeCard's own maxWidth ceiling (265 + 1.35*85 ≈ 380) with room to spare
const ROW_H = 230; // vertical budget per card — generous enough for a two-line card plus jitter, not tightly fit
// Cards on a side aren't pinned to one vertical line — each is nudged closer
// to or further from the circle by up to half of this, so the side reads as
// a loose scatter (some cards near the circle, some out near the edge)
// rather than a stiff column. Margin has to cover the outward half of this
// so a staggered card never crops off the canvas edge.
const STAGGER_X = 260;
const OUTER_MARGIN_X = 90 + STAGGER_X / 2;
const OUTER_MARGIN_Y = 40;

// Spreads a side's cards evenly across the FULL height available to it (not
// tightly packed around the vertical center) — each card gets an equal slot
// from y0 to y1, so the first and last cards land close to the true top and
// bottom margins instead of clustering in the middle band. A small jitter on
// top (bounded to a fraction of the slot, so it can't touch a neighbor) plus
// the same seeded horizontal stagger as the leg's own wobble keeps it
// organic rather than a visible, evenly-ruled grid.
function layoutSide(sideNodes: MindmapNode[], baseX: number, y0: number, y1: number, seedStart: number) {
  const n = sideNodes.length || 1;
  const slot = (y1 - y0) / n;
  return sideNodes.map((node, i) => {
    const seed = seedStart + i;
    const centerY = y0 + slot * (i + 0.5);
    const jy = (seededRandom(seed * 5.7) - 0.5) * slot * 0.16;
    const jx = (seededRandom(seed * 3.3) - 0.5) * STAGGER_X;
    return { node, x: baseX + jx, y: centerY + jy, seed };
  });
}

// Left/right diagram — center photo with every node scattered across one of
// two sides, straight left or straight right of the circle, never above or
// below it — connected by a gently wavy "spider leg." Cards spread across
// the side's FULL height range (reaching toward the top and bottom, not
// clustered around the middle) and jitter horizontally too, so the diagram
// uses the whole box instead of leaving the corners empty. The canvas is
// measured against the space actually left on the page and scaled to fill it
// exactly (shrinking OR growing) — the couple should see the entire map at a
// glance, filling the screen, never scroll to find a node. Desktop/tablet
// only — see StackedMindmap for the mobile fallback.
function RadialMindmap(props: MindmapProps) {
  const nodes = buildNodes(props);
  const half = Math.ceil(nodes.length / 2);
  const leftNodes = nodes.slice(0, half);
  const rightNodes = nodes.slice(half);
  const maxPerSide = Math.max(leftNodes.length, rightNodes.length, 1);

  const canvasW = OUTER_MARGIN_X * 2 + CARD_W_BUDGET * 2 + COL_GAP * 2 + CIRCLE_D;
  const canvasH = Math.max(500, maxPerSide * ROW_H + OUTER_MARGIN_Y * 2);
  const cx = OUTER_MARGIN_X + CARD_W_BUDGET + COL_GAP + CIRCLE_D / 2;
  const cy = canvasH / 2;
  const leftX = OUTER_MARGIN_X + CARD_W_BUDGET / 2;
  const rightX = canvasW - OUTER_MARGIN_X - CARD_W_BUDGET / 2;

  const wrapRef = useRef<HTMLDivElement>(null);
  // availableHeight starts null (SSR-safe — no window access during render) and
  // is filled in after mount, once we can measure how much viewport is actually
  // left for the diagram. Until then the diagram renders at scale 1 and a
  // flash of its natural size is possible for a frame, same tradeoff every
  // other client-measured layout in this app already makes.
  const [{ scale, availableHeight }, setFit] = useState<{ scale: number; availableHeight: number | null }>({ scale: 1, availableHeight: null });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    // The app shell wraps every page's content in a fixed pb-16 (64px) of
    // bottom padding (src/components/app-shell.tsx) — a known constant, not
    // something worth re-deriving from the DOM on every resize — plus a
    // little breathing room, subtracted from the space actually left below
    // this diagram's own top edge so the page never ends up needing to scroll.
    const TRAILING_CHROME = 64 + 16;
    const fit = () => {
      const top = el.getBoundingClientRect().top;
      const availableH = Math.max(360, window.innerHeight - top - TRAILING_CHROME);
      const availableW = el.clientWidth;
      setFit({ scale: Math.max(0.4, Math.min(availableW / canvasW, availableH / canvasH)), availableHeight: availableH });
    };
    fit();
    // `top` depends on everything rendered above this wrapper (the header,
    // subtitle, breadcrumb) — a ONE-TIME on-mount measurement plus a window
    // resize listener isn't enough, because that content can change height
    // for reasons that never fire a window resize event: a font finishing
    // its load, a subtitle wrapping differently once real data arrives, or
    // (what was actually happening here) an edit to the shared header
    // shrinking it while this component was already mounted. A ResizeObserver
    // on the whole page catches all of those and re-measures accordingly.
    const settle = setTimeout(fit, 200);
    window.addEventListener("resize", fit);
    const ro = new ResizeObserver(fit);
    ro.observe(document.body);
    return () => { clearTimeout(settle); window.removeEventListener("resize", fit); ro.disconnect(); };
  }, [canvasW, canvasH]);

  const positions = [
    ...layoutSide(leftNodes, leftX, OUTER_MARGIN_Y, canvasH - OUTER_MARGIN_Y, 1),
    ...layoutSide(rightNodes, rightX, OUTER_MARGIN_Y, canvasH - OUTER_MARGIN_Y, 1 + leftNodes.length),
  ];

  return (
    <div ref={wrapRef} className="hidden sm:flex items-center justify-center overflow-hidden" style={availableHeight != null ? { height: availableHeight } : undefined}>
      <div style={{ width: canvasW * scale, height: canvasH * scale, overflow: "hidden" }}>
        <div className="relative" style={{ width: canvasW, height: canvasH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <svg className="absolute inset-0 pointer-events-none" width={canvasW} height={canvasH}>
            <defs>
              {LEG_COLORS.map((color, i) => (
                <marker key={i} id={`mindmap-arrow-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5.5" markerHeight="5.5" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={color} />
                </marker>
              ))}
            </defs>
            {positions.map(({ node, x, y, seed }, i) => {
              const color = LEG_COLORS[i % LEG_COLORS.length];
              return (
                <path key={node.key} d={squigglyPath(cx, cy, x, y, seed)} fill="none" stroke={color} strokeWidth={5.5}
                  strokeLinecap="round" strokeLinejoin="round" markerEnd={`url(#mindmap-arrow-${i % LEG_COLORS.length})`} />
              );
            })}
          </svg>

          <div className="absolute" style={{ left: cx, top: cy, transform: "translate(-50%, -50%)" }}>
            <CenterPhoto photoUrl={props.wedding.couple_photo_url} nameA={props.wedding.partner_a} nameB={props.wedding.partner_b}
              zoom={props.wedding.couple_photo_zoom ?? 1} panX={props.wedding.couple_photo_pan_x ?? 0} panY={props.wedding.couple_photo_pan_y ?? 0}
              onUpload={props.onUploadPhoto} onCropChange={props.onCropChange} />
          </div>

          {positions.map(({ node, x, y }) => (
            <NodeCard key={node.key} node={node} className="absolute" style={{ left: x, top: y, transform: "translate(-50%, -50%)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Mobile fallback: a radial layout doesn't hold up at phone width (nodes would
// either overlap or shrink illegibly) — same content, simple vertical stack.
function StackedMindmap(props: MindmapProps) {
  const nodes = buildNodes(props);
  return (
    <div className="sm:hidden p-1">
      <div className="flex justify-center">
        <CenterPhoto photoUrl={props.wedding.couple_photo_url} nameA={props.wedding.partner_a} nameB={props.wedding.partner_b}
          zoom={props.wedding.couple_photo_zoom ?? 1} panX={props.wedding.couple_photo_pan_x ?? 0} panY={props.wedding.couple_photo_pan_y ?? 0}
          onUpload={props.onUploadPhoto} onCropChange={props.onCropChange} sizeClassName="h-24 w-24" />
      </div>
      <div className="mt-5 space-y-2">
        {nodes.map((n) => <NodeCard key={n.key} node={n} className="block" style={{ maxWidth: "100%" }} />)}
      </div>
    </div>
  );
}

export function WeddingMindmap(props: MindmapProps) {
  return (
    <>
      <RadialMindmap {...props} />
      <StackedMindmap {...props} />
    </>
  );
}
