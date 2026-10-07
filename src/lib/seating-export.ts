import jsPDF from "jspdf";
import { registerPoppins, PDF_FONT } from "@/lib/pdf-fonts";
import autoTable from "jspdf-autotable";
import type { Guest, WTable, Seat } from "@/lib/wedding-hooks";
import {
  SHAPE_DEFAULT_SIZE, MIN_CHAIR_SIZE, chairTierFor, abbreviateTableLabel, getInitials,
  TOGETHER_CYCLE, isTogetherArr, chairPositions, facingPositions, togetherPositions, headSeatPositions, isDark,
  type Arrangement, type ShapeKey,
} from "@/lib/seating-geometry";

const DEFAULT_CANVAS_W = 1200;
const DEFAULT_CANVAS_H = 800;

// App palette, so the printout reads as the same product as the on-screen floor plan.
const INK = "#243746";
const PAPER = "#FFFEFB";
const BORDER = "#D4D4D4";
const DANGER = "#D64550";
const PT_PER_MM = 2.835;

export type SeatingFixtureLike = { id: string; label: string | null; kind: string; shape?: string | null; color?: string | null; pos_x: number; pos_y: number; width: number; height: number };
export type SeatingAreaLike = { id: string; label: string | null; color?: string | null; pos_x: number; pos_y: number; width: number; height: number };

export type SeatingExportInput = {
  weddingLabel: string; // slug or id, used for the filename
  eventName: string;
  eventDate: string | null; // ISO date, e.g. event.event_date
  tables: WTable[];
  fixtures: SeatingFixtureLike[];
  areas: SeatingAreaLike[];
  seats: Seat[];
  guests: Guest[];
  floorColor?: string | null;
  canvasWidth?: number | null;
  canvasHeight?: number | null;
};

function dateLabel(d: string | null) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date TBD";
}

function parseHex(hex: string): [number, number, number] {
  let h = (hex ?? "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n) || h.length < 6) return [255, 255, 255];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// jsPDF has no cheap per-shape opacity, so translucent layers (areas at 40%, borders at
// 15%) are pre-blended against whatever sits beneath them.
function blend(fg: string, bg: string, alpha: number): [number, number, number] {
  const a = parseHex(fg), b = parseHex(bg);
  return [0, 1, 2].map((i) => Math.round(a[i] * alpha + b[i] * (1 - alpha))) as [number, number, number];
}
const toHex = ([r, g, b]: [number, number, number]) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");

// Draws a vector replica of the on-screen floor plan (not a screenshot) so it stays crisp at
// any print size, then follows it with a table-by-table guest list.
export async function exportSeatingPdf(input: SeatingExportInput) {
  const { weddingLabel, eventName, eventDate, tables, fixtures, areas, seats, guests } = input;
  const floor = input.floorColor ?? PAPER;
  const canvasW = input.canvasWidth ?? DEFAULT_CANVAS_W;
  const canvasH = input.canvasHeight ?? DEFAULT_CANVAS_H;

  const doc = new jsPDF({ orientation: "landscape" });
  await registerPoppins(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;

  const fill = (hex: string | [number, number, number]) => {
    const [r, g, b] = typeof hex === "string" ? parseHex(hex) : hex;
    doc.setFillColor(r, g, b);
  };
  const stroke = (hex: string | [number, number, number]) => {
    const [r, g, b] = typeof hex === "string" ? parseHex(hex) : hex;
    doc.setDrawColor(r, g, b);
  };
  const textColor = (hex: string) => { const [r, g, b] = parseHex(hex); doc.setTextColor(r, g, b); };

  // Header
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(18);
  textColor(INK);
  doc.text(eventName, margin, 16);
  doc.setFont(PDF_FONT, "normal");
  doc.setFontSize(10);
  textColor("#6B7A8F");
  doc.text(dateLabel(eventDate), margin, 22);

  // Floor, scaled to fit under the header and centred.
  const boxX = margin, boxY = 28, boxW = pageW - margin * 2, boxH = pageH - boxY - margin;
  const scale = Math.min(boxW / canvasW, boxH / canvasH);
  const planW = canvasW * scale, planH = canvasH * scale;
  const offX = boxX + (boxW - planW) / 2;
  const offY = boxY + (boxH - planH) / 2;
  const sx = (x: number) => offX + x * scale;
  const sy = (y: number) => offY + y * scale;
  const pt = (px: number, min = 4) => Math.max(min, px * scale * PT_PER_MM);

  fill(floor);
  stroke(BORDER);
  doc.setLineWidth(0.3);
  doc.rect(offX, offY, planW, planH, "FD");

  // Areas sit at the back at 40% opacity with a faint dashed outline.
  areas.forEach((a) => {
    const x = sx(a.pos_x), y = sy(a.pos_y), w = a.width * scale, h = a.height * scale;
    const col = blend(a.color ?? "#E4EDD8", floor, 0.4);
    fill(col);
    stroke(blend(INK, toHex(col), 0.2));
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1, 1], 0);
    doc.roundedRect(x, y, w, h, 16 * scale, 16 * scale, "FD");
    doc.setLineDashPattern([], 0);
    if (a.label) {
      doc.setFont(PDF_FONT, "normal");
      doc.setFontSize(pt(14));
      textColor(INK);
      doc.text(a.label.toUpperCase(), x + w / 2, y + h / 2, { align: "center", baseline: "middle", maxWidth: w - 4 });
    }
  });

  fixtures.forEach((f) => {
    const x = sx(f.pos_x), y = sy(f.pos_y), w = f.width * scale, h = f.height * scale;
    const shape = f.shape ?? (f.kind === "dance_floor" ? "round" : "rect");
    const base = f.color ?? "#EDE7DA";
    fill(blend(base, floor, 0.92));
    doc.setLineWidth(0);
    if (shape === "round") doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, "F");
    else doc.roundedRect(x, y, w, h, 8 * scale, 8 * scale, "F");
    if (f.label) {
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(pt(14));
      textColor(isDark(base) ? "#FEFDFA" : "#1A1512");
      doc.text(f.label.toUpperCase(), x + w / 2, y + h / 2, { align: "center", baseline: "middle", maxWidth: w - 4 });
    }
  });

  const guestById = new Map(guests.map((g) => [g.id, g]));

  tables.forEach((t) => {
    const w = t.width, h = t.height;
    const shape = (t.shape ?? "round") as ShapeKey;
    const isRound = shape === "round";
    const mat = t.mat_color ?? "#F5EEDC";
    const tableSeats = seats.filter((s) => s.table_id === t.id);
    const slotCount = Math.max(t.seats ?? 0, tableSeats.length, 0);
    const capacity = Math.max(t.seats ?? slotCount, slotCount, 1);

    // Same chip sizing/layout rules as the on-screen TableNode.
    const baseline = SHAPE_DEFAULT_SIZE[shape];
    const sizeScale = Math.min(1, isRound ? w / baseline.w : Math.min(w / baseline.w, h / baseline.h));
    const capTier = chairTierFor(capacity);
    const chip = Math.max(MIN_CHAIR_SIZE, Math.round(capTier.size * sizeScale));
    const chipFont = Math.max(7, Math.round(capTier.fontSize * sizeScale));
    const gap = capacity <= 4 ? 12 : capacity <= 8 ? 10 : 8;

    const stored = t.seat_arrangement;
    const arrangement: Arrangement = isRound ? "facing"
      : stored === "head" || TOGETHER_CYCLE.includes(stored as Arrangement) ? (stored as Arrangement)
      : "facing";
    const defaults = () => {
      const pos = isRound ? chairPositions(w, h, slotCount, chip, gap)
        : arrangement === "head" ? headSeatPositions(w, h, slotCount, chip, gap)
        : isTogetherArr(arrangement)
          ? togetherPositions(w, h, slotCount, chip, gap, arrangement === "together_flip" ? "bottom" : arrangement === "together_left" ? "left" : arrangement === "together_right" ? "right" : "top")
          : facingPositions(w, h, slotCount, chip, gap);
      return pos.map((p) => ({ x: p.x / w, y: p.y / h }));
    };
    const storedLayout = Array.isArray(t.seat_layout) ? (t.seat_layout as { x: number; y: number }[]) : null;
    const usable = !!storedLayout && storedLayout.length === slotCount && !storedLayout.some((a, i) =>
      storedLayout.some((b, j) => j > i && Math.hypot((a.x - b.x) * w, (a.y - b.y) * h) < chip + 6));
    const fractions = usable ? storedLayout! : defaults();
    const slots = fractions.map((f) => ({ x: f.x * w, y: f.y * h }));

    // Resolve which slot each guest occupies (legacy rows may have no seat_index).
    const claimed = new Set(tableSeats.map((s) => s.seat_index).filter((i): i is number => i != null && i < slotCount));
    const unclaimed: number[] = [];
    for (let i = 0; i < slotCount; i++) if (!claimed.has(i)) unclaimed.push(i);
    let cursor = 0;
    const occupant = new Map<number, Seat>();
    [...tableSeats]
      .sort((a, b) => (a.seat_index ?? Infinity) - (b.seat_index ?? Infinity))
      .forEach((s) => occupant.set(s.seat_index != null && s.seat_index < slotCount ? s.seat_index : unclaimed[cursor++], s));

    const x = sx(t.pos_x), y = sy(t.pos_y), tw = w * scale, th = h * scale;

    // Table body
    fill(mat);
    stroke(blend(INK, mat, 0.12));
    doc.setLineWidth(0.15);
    if (isRound) doc.ellipse(x + tw / 2, y + th / 2, tw / 2, th / 2, "FD");
    else doc.roundedRect(x, y, tw, th, 16 * scale, 16 * scale, "FD");

    // Always the short form ("T1", "T2") — same as the app at its smallest size.
    const label = abbreviateTableLabel(t.label);
    doc.setFont(PDF_FONT, "bold");
    doc.setFontSize(pt(capacity <= 6 ? 13 : 11));
    textColor(INK);
    const hasCount = (t.seats ?? 0) > 0;
    doc.text(label, x + tw / 2, y + th / 2 - (hasCount ? 9 * scale : 0), { align: "center", baseline: "middle" });
    if (hasCount) {
      doc.setFont(PDF_FONT, "normal");
      doc.setFontSize(pt(capacity <= 8 ? 14 : 12));
      doc.text(`${tableSeats.length}/${t.seats}`, x + tw / 2, y + th / 2 + 13 * scale, { align: "center", baseline: "middle" });
    }

    // Seats: dashed circles for empty slots, paper chips with initials for guests.
    slots.forEach((p, i) => {
      const cx = x + p.x * scale, cy = y + p.y * scale, r = (chip * scale) / 2;
      const seat = occupant.get(i);
      if (!seat) {
        fill(floor);
        stroke("#9CA3AF");
        doc.setLineWidth(0.2);
        doc.setLineDashPattern([0.8, 0.8], 0);
        doc.circle(cx, cy, r, "FD");
        doc.setLineDashPattern([], 0);
        return;
      }
      const guest = guestById.get(seat.guest_id);
      fill(PAPER);
      stroke(blend(INK, PAPER, 0.4));
      doc.setLineWidth(0.25);
      doc.circle(cx, cy, r, "FD");
      doc.setFont(PDF_FONT, "bold");
      doc.setFontSize(pt(chipFont, 4.5));
      textColor(INK);
      doc.text(getInitials(guest?.full_name ?? "?"), cx, cy, { align: "center", baseline: "middle" });
      if (guest && ((guest.dietary_tags?.length ?? 0) > 0 || (guest.food_allergies?.length ?? 0) > 0)) {
        const br = Math.max(1.1, 7 * scale);
        fill(DANGER);
        doc.setLineWidth(0);
        doc.circle(cx + r * 0.75, cy - r * 0.75, br, "F");
        doc.setFontSize(Math.max(4, br * 2 * PT_PER_MM * 0.8));
        textColor(PAPER);
        doc.text("i", cx + r * 0.75, cy - r * 0.75, { align: "center", baseline: "middle" });
      }
    });
  });

  // Guest list on its own page, tinted to the same palette; each table's swatch uses its
  // tablecloth colour so rows map back to the plan.
  const sorted = tables.slice().sort((a, b) => a.sort_order - b.sort_order);
  const body = sorted.map((t) => {
    const names = seats
      .filter((s) => s.table_id === t.id)
      .sort((a, b) => (a.seat_index ?? 999) - (b.seat_index ?? 999))
      .map((s) => guestById.get(s.guest_id)?.full_name ?? "Unknown guest");
    return [`${abbreviateTableLabel(t.label)}  ${t.label}`, `${names.length}/${t.seats}`, names.join(", ") || "-"];
  });
  doc.addPage();
  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(16);
  textColor(INK);
  doc.text(`${eventName} guest list`, margin, 16);
  autoTable(doc, {
    startY: 22,
    head: [["Table", "Seated", "Guests"]],
    body,
    styles: { font: PDF_FONT, fontSize: 9, textColor: parseHex(INK), lineColor: parseHex(BORDER), lineWidth: 0.1 },
    headStyles: { fillColor: parseHex(INK), textColor: parseHex(PAPER) },
    alternateRowStyles: { fillColor: parseHex("#F7F9FC") },
    columnStyles: { 0: { cellWidth: 46 }, 1: { cellWidth: 20 } },
    margin: { left: margin, right: margin },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        data.cell.styles.fillColor = parseHex(sorted[data.row.index]?.mat_color ?? "#F5EEDC");
        data.cell.styles.fontStyle = "bold";
      }
    },
  });

  doc.save(`wedthread-seating-${weddingLabel}.pdf`);
}
