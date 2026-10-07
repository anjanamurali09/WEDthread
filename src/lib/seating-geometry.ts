// Pure seating geometry shared by the floor-plan editor and the PDF export, so both lay
// seats out identically.

export type ShapeKey = "round" | "rect" | "square";

// Baseline size each shape starts at (matches the ShapePicker's own defaults below) — a
// table's current size relative to this is what drives chair-chip scaling, so shrinking a
// table below its "normal" size shrinks its guests' initials chips too.
export const SHAPE_DEFAULT_SIZE: Record<ShapeKey, { w: number; h: number }> = {
  round: { w: 140, h: 140 }, rect: { w: 200, h: 90 }, square: { w: 120, h: 120 },
};
// Floor for chair chips shrinking with the table — small enough to matter, large enough
// that two-letter initials still read on one line.
export const MIN_CHAIR_SIZE = 18;
export const MIN_CHAIR_FONT = 7;

export type ChairTier = { size: number; fontSize: number };
export function chairTierFor(capacity: number): ChairTier {
  if (capacity <= 4) return { size: 52, fontSize: 14 };
  if (capacity <= 6) return { size: 44, fontSize: 12 };
  if (capacity <= 8) return { size: 38, fontSize: 11 };
  if (capacity <= 10) return { size: 28, fontSize: 9 };
  return { size: 22, fontSize: 8 };
}
// At a table's smallest allowed size, its own free-text label ("Table 5") no longer
// fits and just truncates to "T..." — this collapses it to the first letter plus any
// trailing number instead ("Table 5" -> "T5"), which reads as an actual table number
// rather than a clipped fragment. Falls back to the first couple characters for a
// label with no trailing number ("Head Table" -> "HE").
export function abbreviateTableLabel(label: string): string {
  const trimmed = (label ?? "").trim();
  if (!trimmed) return "T";
  const trailingDigits = trimmed.match(/(\d+)\s*$/)?.[1];
  if (trailingDigits) return `${trimmed[0].toUpperCase()}${trailingDigits}`;
  return trimmed.slice(0, 2).toUpperCase();
}
export function getInitials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type Arrangement = "facing" | "head" | "together" | "together_flip" | "together_left" | "together_right";
export const isTogetherArr = (a: string | null | undefined) => !!a && a.startsWith("together");
// Together sides, in the order repeated clicks cycle through them.

export const TOGETHER_CYCLE: Arrangement[] = ["together", "together_flip", "together_left", "together_right"];

/* --- Geometry: chair positions on the perimeter --- */
// Round tables only now (rect/square go through facingPositions/headSeatPositions below
// instead) — evenly distributes n seats around an ellipse inscribed by the table's own
// width/height.
export function chairPositions(w: number, h: number, n: number, chair: number, gap: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  const off = chair / 2 + gap;
  const rx = w / 2 + off;
  const ry = h / 2 + off;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    out.push({ x: w / 2 + rx * Math.cos(a), y: h / 2 + ry * Math.sin(a) });
  }
  return out;
}

// Which pair of edges counts as the table's "long sides" vs. "short ends" — the edges
// that run along the LONGER dimension are the long sides (e.g. a 200x90 table's top/
// bottom edges are each 200 long, so top/bottom are the long sides and left/right, each
// only 90 long, are the short ends). A tie (square) falls to top/bottom, arbitrarily but
// deterministically.
export function longSidesAreTopBottom(w: number, h: number): boolean {
  return w >= h;
}

// "Facing" arrangement: seats split evenly between the two LONG sides only — n/2 and n/2
// (the extra seat on an odd n going to the first group), each evenly spaced and mirrored
// directly across from its counterpart on the opposite side (same spacing formula/count
// on both sides produces matching positions). Zero seats on the short ends.
export function facingPositions(w: number, h: number, n: number, chair: number, gap: number): { x: number; y: number }[] {
  const off = chair / 2 + gap;
  const out: { x: number; y: number }[] = [];
  if (n <= 0) return out;
  const sideACount = Math.ceil(n / 2);
  const sideBCount = n - sideACount;
  if (longSidesAreTopBottom(w, h)) {
    for (let i = 0; i < sideACount; i++) out.push({ x: ((i + 1) / (sideACount + 1)) * w, y: -off });
    for (let i = 0; i < sideBCount; i++) out.push({ x: ((i + 1) / (sideBCount + 1)) * w, y: h + off });
  } else {
    for (let i = 0; i < sideACount; i++) out.push({ x: -off, y: ((i + 1) / (sideACount + 1)) * h });
    for (let i = 0; i < sideBCount; i++) out.push({ x: w + off, y: ((i + 1) / (sideBCount + 1)) * h });
  }
  return out;
}

// "Together" arrangement: every seat on ONE long side, evenly spaced (the couple's side-by-
// side sweetheart-table layout, or one-sided head table) on any one of the four sides.
export function togetherPositions(w: number, h: number, n: number, chair: number, gap: number, side: "top" | "bottom" | "left" | "right"): { x: number; y: number }[] {
  const off = chair / 2 + gap;
  const out: { x: number; y: number }[] = [];
  const horizontal = side === "top" || side === "bottom";
  const along = horizontal ? w : h;
  // Even thirds/quarters of the side alone puts chips closer together than their own
  // diameter on a short side (two on a 120px side sit 40px apart, under a 44px chip), so
  // the spacing is floored at a chip plus a small gap and the group is re-centered —
  // overhanging the table's ends a little beats overlapping each other.
  const pitch = Math.max(along / (n + 1), chair + 8);
  const start = along / 2 - ((n - 1) * pitch) / 2;
  for (let i = 0; i < n; i++) {
    const t = start + i * pitch;
    if (horizontal) out.push({ x: t, y: side === "bottom" ? h + off : -off });
    else out.push({ x: side === "right" ? w + off : -off, y: t });
  }
  return out;
}

// "Head seats" arrangement: one seat centered on each SHORT end, the rest split evenly
// (ceil/floor) between the two long sides. Only meaningful for rect/square tables (see
// seat_arrangement) — always returns exactly n positions, in the same pixel-offset-
// relative-to-table-origin convention facingPositions()/chairPositions() use. Order is
// [short end A, short end B, long side A..., long side B...], which becomes the slot
// index order (slot 0 = first head seat, slot 1 = the other head seat, etc).
export function headSeatPositions(w: number, h: number, n: number, chair: number, gap: number): { x: number; y: number }[] {
  const off = chair / 2 + gap;
  const out: { x: number; y: number }[] = [];
  if (n <= 0) return out;
  const topBottomAreLong = longSidesAreTopBottom(w, h);
  // Short-end head seats: left/right centers when top/bottom are the long sides,
  // top/bottom centers otherwise.
  out.push(topBottomAreLong ? { x: -off, y: h / 2 } : { x: w / 2, y: -off });
  if (n === 1) return out;
  out.push(topBottomAreLong ? { x: w + off, y: h / 2 } : { x: w / 2, y: h + off });
  const remaining = n - 2;
  if (remaining <= 0) return out;
  const sideACount = Math.ceil(remaining / 2);
  const sideBCount = remaining - sideACount;
  if (topBottomAreLong) {
    for (let i = 0; i < sideACount; i++) out.push({ x: ((i + 1) / (sideACount + 1)) * w, y: -off });
    for (let i = 0; i < sideBCount; i++) out.push({ x: ((i + 1) / (sideBCount + 1)) * w, y: h + off });
  } else {
    for (let i = 0; i < sideACount; i++) out.push({ x: -off, y: ((i + 1) / (sideACount + 1)) * h });
    for (let i = 0; i < sideBCount; i++) out.push({ x: w + off, y: ((i + 1) / (sideBCount + 1)) * h });
  }
  return out;
}

export function isDark(hex?: string | null) {
  if (!hex || !hex.startsWith("#")) return false;
  const h = hex.slice(1);
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(v.slice(0, 2), 16), g = parseInt(v.slice(2, 4), 16), b = parseInt(v.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}
