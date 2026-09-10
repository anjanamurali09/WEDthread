import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Guest, WTable, Seat } from "@/lib/wedding-hooks";

const CANVAS_W = 1400;
const CANVAS_H = 900;

export type SeatingFixtureLike = { id: string; label: string | null; kind: string; pos_x: number; pos_y: number; width: number; height: number };

export type SeatingExportInput = {
  weddingLabel: string; // slug or id, used for the filename
  eventName: string;
  eventDate: string | null; // ISO date, e.g. event.event_date
  tables: WTable[];
  fixtures: SeatingFixtureLike[];
  seats: Seat[];
  guests: Guest[];
};

function dateLabel(d: string | null) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : "Date TBD";
}

function guestName(guests: Guest[], guestId: string) {
  return guests.find((g) => g.id === guestId)?.full_name ?? "Unknown guest";
}

// Draws a vector schematic (not a screenshot) so it stays crisp and small at any print
// size — the floor plan is simple enough (tables, fixtures, labels) that jsPDF's own
// rect/ellipse/text primitives reproduce it faithfully without pulling in a rasterizing
// dependency like html2canvas.
export function exportSeatingPdf(input: SeatingExportInput) {
  const { weddingLabel, eventName, eventDate, tables, fixtures, seats, guests } = input;
  const doc = new jsPDF({ orientation: "landscape" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;

  doc.setFontSize(18);
  doc.text(eventName, margin, 18);
  doc.setFontSize(10);
  doc.setTextColor(110, 110, 110);
  doc.text(dateLabel(eventDate), margin, 25);
  doc.setTextColor(20, 20, 20);

  // Floor plan, scaled to fit the printable area under the header.
  const areaX = margin, areaY = 34, areaW = pageW - margin * 2, areaH = 140;
  const scale = Math.min(areaW / CANVAS_W, areaH / CANVAS_H);
  const offX = areaX + (areaW - CANVAS_W * scale) / 2;
  const offY = areaY + (areaH - CANVAS_H * scale) / 2;
  const sx = (x: number) => offX + x * scale;
  const sy = (y: number) => offY + y * scale;

  doc.setDrawColor(200, 200, 200);
  doc.rect(areaX, areaY, areaW, areaH);

  fixtures.forEach((f) => {
    const w = f.width * scale, h = f.height * scale, x = sx(f.pos_x), y = sy(f.pos_y);
    doc.setFillColor(235, 230, 220);
    doc.roundedRect(x, y, w, h, 1, 1, "F");
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text(f.label || f.kind, x + w / 2, y + h / 2, { align: "center", baseline: "middle" });
  });

  tables.forEach((t) => {
    const w = t.width * scale, h = t.height * scale, x = sx(t.pos_x), y = sy(t.pos_y);
    doc.setFillColor(250, 240, 225);
    doc.setDrawColor(180, 150, 110);
    if (t.shape === "round") {
      doc.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, "FD");
    } else {
      doc.roundedRect(x, y, w, h, t.shape === "square" ? 2 : 1, t.shape === "square" ? 2 : 1, "FD");
    }
    const occupied = seats.filter((s) => s.table_id === t.id).length;
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(`${t.label}`, x + w / 2, y + h / 2 - 2, { align: "center", baseline: "middle" });
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(`${occupied}/${t.seats}`, x + w / 2, y + h / 2 + 5, { align: "center", baseline: "middle" });
  });
  doc.setTextColor(20, 20, 20);

  // Table-by-table guest list — the print-friendly fallback the visual layout can't
  // always convey (seat counts and small labels shrink fast at scale).
  const body = tables
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => {
      const names = seats.filter((s) => s.table_id === t.id).map((s) => guestName(guests, s.guest_id)).sort();
      return [t.label, `${names.length}/${t.seats}`, names.join(", ") || "—"];
    });
  autoTable(doc, {
    startY: areaY + areaH + 10,
    head: [["Table", "Seated", "Guests"]],
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [138, 18, 38] },
    columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 20 } },
    margin: { left: margin, right: margin },
  });

  doc.save(`wedthread-seating-${weddingLabel}.pdf`);
}
