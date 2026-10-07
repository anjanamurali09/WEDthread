import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

// Cuts to at most maxLength characters, breaking at the last whole word
// (never mid-word) and appending an ellipsis — used to keep a fixed-height
// panel from stretching to fit whatever length copy a listing happens to have.
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
}

// Same idea as truncateText, but measured in words rather than characters.
// Keeps the original spacing and line breaks up to the cut, so a description with blank lines
// between paragraphs still reads as paragraphs when it is shortened.
export function truncateWords(text: string, maxWords: number): string {
  const trimmed = text.trim();
  let count = 0;
  for (const m of trimmed.matchAll(/\S+/g)) {
    count++;
    if (count === maxWords) {
      const end = (m.index ?? 0) + m[0].length;
      return end >= trimmed.length ? text : trimmed.slice(0, end) + "…";
    }
  }
  return text;
}

// Collapses case-insensitive duplicate labels, keeping the first occurrence
// — vendor_categories has known near-duplicates from two taxonomies that
// were never fully reconciled (e.g. "Photography" vs "Photographer"), so
// every category picker dedupes at render time rather than in the data.
export function dedupeByLabel<T extends { label: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const key = i.label.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
