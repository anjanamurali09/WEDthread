import jsPDF from "jspdf";
import { registerPoppins, PDF_FONT } from "@/lib/pdf-fonts";
import ExcelJS from "exceljs";
import type { MenuItem } from "@/lib/wedding-hooks";
import { dishCodes, foodLookup, legendFor, type FoodTagLike } from "@/lib/dietary-tags";

type MenuSection = { id: string; name: string };

export type MenuTheme = { bg: string; ink: string };

export type MenuExportInput = {
  theme?: MenuTheme | null; // the website's colours, when the menu should match the wedding website
  weddingLabel: string; // slug or id, used for the filename
  eventName: string;
  sections: MenuSection[];
  items: MenuItem[];
  foodTags: FoodTagLike[];
};

// Same dark card as MenuPreviewPanel (bg-ink text-paper) — both exports
// reuse these exact colors so the download matches what's on screen instead
// of falling back to a generic white/black table.
const INK: [number, number, number] = [36, 55, 70]; // --ink #243746
const PAPER: [number, number, number] = [255, 254, 251]; // --paper #FFFEFB
const PAPER_MUTED: [number, number, number] = [167, 174, 179]; // paper at ~60% over ink
const PAPER_FAINT: [number, number, number] = [79, 95, 106]; // paper at ~20% over ink, for dividers
const ALLERGEN_RED: [number, number, number] = [252, 165, 165]; // red-300

type Rgb = [number, number, number];
const hexToRgb = (hex: string): Rgb => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(full.slice(0, 2), 16) || 0, parseInt(full.slice(2, 4), 16) || 0, parseInt(full.slice(4, 6), 16) || 0];
};
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [0, 1, 2].map((i) => Math.round(a[i] * (1 - t) + b[i] * t)) as Rgb;
const isDarkRgb = (c: Rgb) => (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) < 140;

// The colours a menu is drawn in: the usual dark card, or the wedding website's own background and text colour.
function menuColors(theme?: MenuTheme | null) {
  if (!theme) return { bg: INK, text: PAPER, muted: PAPER_MUTED, faint: PAPER_FAINT, allergen: ALLERGEN_RED };
  const bg = hexToRgb(theme.bg), text = hexToRgb(theme.ink);
  return { bg, text, muted: mix(bg, text, 0.62), faint: mix(bg, text, 0.2), allergen: isDarkRgb(bg) ? ALLERGEN_RED : ([185, 28, 28] as Rgb) };
}

const rgbHex = (rgb: [number, number, number]) => `FF${rgb.map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();

export async function exportMenuExcel(input: MenuExportInput) {
  const { weddingLabel, eventName, sections, items, foodTags } = input;
  const c = menuColors(input.theme);
  const lookup = foodLookup(foodTags);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Menu");
  ws.columns = [{ width: 30 }, { width: 12 }, { width: 16 }, { width: 46 }];

  const inkFill: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: rgbHex(c.bg) } };
  const fillRow = (row: ExcelJS.Row) => {
    row.eachCell({ includeEmpty: true }, (cell) => { cell.fill = inkFill; });
  };
  const addBlankRow = () => { const r = ws.addRow([]); fillRow(r); return r; };

  const titleRow = ws.addRow([eventName ? `${eventName} Menu` : "Menu"]);
  fillRow(titleRow);
  titleRow.getCell(1).font = { name: "Poppins", size: 18, bold: true, color: { argb: rgbHex(c.text) } };
  ws.mergeCells(titleRow.number, 1, titleRow.number, 4);
  addBlankRow();

  sections.forEach((s) => {
    const sectionItems = items.filter((i) => i.section_id === s.id);
    const header = ws.addRow([s.name.toUpperCase()]);
    fillRow(header);
    header.getCell(1).font = { name: "Poppins", size: 10, bold: true, color: { argb: rgbHex(c.muted) } };
    header.getCell(1).border = { bottom: { style: "thin", color: { argb: rgbHex(c.faint) } } };
    ws.mergeCells(header.number, 1, header.number, 4);

    if (sectionItems.length === 0) {
      const r = ws.addRow(["Nothing added yet"]);
      fillRow(r);
      r.getCell(1).font = { name: "Poppins", italic: true, size: 11, color: { argb: rgbHex(c.muted) } };
    } else {
      sectionItems.forEach((it) => {
        const { diet, allergens } = dishCodes(it.dietary_tags, lookup);
        const r = ws.addRow([
          it.name,
          diet.length ? `(${diet.join(", ")})` : "",
          allergens.length ? `⚠ (${allergens.join(", ")})` : "",
          it.description ?? "",
        ]);
        fillRow(r);
        r.getCell(1).font = { name: "Poppins", size: 12, color: { argb: rgbHex(c.text) } };
        r.getCell(2).font = { name: "Poppins", size: 10, color: { argb: rgbHex(c.muted) } };
        r.getCell(3).font = { name: "Poppins", size: 10, color: { argb: rgbHex(c.allergen) } };
        r.getCell(4).font = { name: "Poppins", size: 10, color: { argb: rgbHex(c.muted) } };
        r.getCell(4).alignment = { wrapText: true, vertical: "top" };
      });
    }
    addBlankRow();
  });

  const legend = legendFor(items.flatMap((it) => it.dietary_tags), foodTags);
  if (legend) {
    const legendRow = ws.addRow([legend]);
    fillRow(legendRow);
    legendRow.getCell(1).font = { name: "Poppins", size: 9, color: { argb: rgbHex(c.muted) } };
    ws.mergeCells(legendRow.number, 1, legendRow.number, 4);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `wedthread-menu-${weddingLabel}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportMenuPdf(input: MenuExportInput) {
  const { weddingLabel, eventName, sections, items, foodTags } = input;
  const c = menuColors(input.theme);
  const lookup = foodLookup(foodTags);
  const doc = new jsPDF();
  await registerPoppins(doc);
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 16;
  const contentW = pageW - marginX * 2;
  const bottomLimit = pageH - 18;

  const paintPage = () => {
    doc.setFillColor(...c.bg);
    doc.rect(0, 0, pageW, pageH, "F");
  };
  paintPage();

  let y = 26;
  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      paintPage();
      y = 22;
    }
  };

  doc.setFont(PDF_FONT, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...c.text);
  doc.text(eventName ? `${eventName} Menu` : "Menu", marginX, y);
  y += 14;

  sections.forEach((s) => {
    const sectionItems = items.filter((i) => i.section_id === s.id);
    ensureSpace(14);
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...c.muted);
    doc.text(s.name.toUpperCase(), marginX, y);
    doc.setDrawColor(...c.faint);
    doc.line(marginX, y + 2.5, marginX + contentW, y + 2.5);
    y += 11;

    if (sectionItems.length === 0) {
      doc.setFont(PDF_FONT, "italic");
      doc.setFontSize(11);
      doc.setTextColor(...c.muted);
      doc.text("Nothing added yet.", marginX, y);
      y += 10;
    } else {
      sectionItems.forEach((it) => {
        const { diet, allergens } = dishCodes(it.dietary_tags, lookup);
        ensureSpace(10);

        doc.setFont(PDF_FONT, "normal");
        doc.setFontSize(13);
        doc.setTextColor(...c.text);
        doc.text(it.name, marginX, y);
        let cursorX = marginX + doc.getTextWidth(it.name) + 3;

        if (diet.length) {
          doc.setFont(PDF_FONT, "normal");
          doc.setFontSize(10);
          doc.setTextColor(...c.muted);
          const t = `(${diet.join(", ")})`;
          doc.text(t, cursorX, y);
          cursorX += doc.getTextWidth(t) + 3;
        }
        if (allergens.length) {
          doc.setFont(PDF_FONT, "normal");
          doc.setFontSize(10);
          doc.setTextColor(...c.allergen);
          doc.text(`(${allergens.join(", ")})`, cursorX, y);
        }
        y += 5.5;

        if (it.description) {
          doc.setFont(PDF_FONT, "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(...c.muted);
          const lines = doc.splitTextToSize(it.description, contentW) as string[];
          lines.forEach((line) => {
            ensureSpace(5.5);
            doc.text(line, marginX, y);
            y += 5;
          });
        }
        y += 4.5;
      });
    }
    y += 5;
  });

  const legend = legendFor(items.flatMap((it) => it.dietary_tags), foodTags);
  if (legend) {
    ensureSpace(14);
    doc.setDrawColor(...c.faint);
    doc.line(marginX, y, marginX + contentW, y);
    y += 7;
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...c.muted);
    const legendLines = doc.splitTextToSize(legend, contentW) as string[];
    legendLines.forEach((line) => { ensureSpace(5); doc.text(line, marginX, y); y += 5; });
  }

  doc.save(`wedthread-menu-${weddingLabel}.pdf`);
}
