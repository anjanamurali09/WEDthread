import type jsPDF from "jspdf";
import poppinsRegularUrl from "@/assets/fonts/Poppins-Regular.ttf?url";
import poppinsBoldUrl from "@/assets/fonts/Poppins-Bold.ttf?url";

// jsPDF only ships the 14 standard PDF fonts, so Poppins has to be embedded from its TTF.
// The files are fetched on first export (not bundled into the page's JS) and cached, then
// registered on each new document. There's no italic cut, so italic maps to regular.
export const PDF_FONT = "Poppins";

let cache: Promise<[string, string]> | null = null;

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export async function registerPoppins(doc: jsPDF) {
  cache ??= Promise.all([toBase64(poppinsRegularUrl), toBase64(poppinsBoldUrl)]);
  const [regular, bold] = await cache;
  doc.addFileToVFS("Poppins-Regular.ttf", regular);
  doc.addFileToVFS("Poppins-Bold.ttf", bold);
  doc.addFont("Poppins-Regular.ttf", PDF_FONT, "normal");
  doc.addFont("Poppins-Regular.ttf", PDF_FONT, "italic");
  doc.addFont("Poppins-Bold.ttf", PDF_FONT, "bold");
  doc.setFont(PDF_FONT, "normal");
}
