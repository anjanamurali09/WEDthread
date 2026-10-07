// $ tiers instead of raw currency amounts — a plain bucket, not a real
// currency conversion, shared by both venue and vendor pricing (admin form,
// self-serve onboarding, marketplace directories, detail pages). A price
// field's stored value is always one tier's own `min` boundary, used as a
// stand-in id for that tier.
export const PRICE_TIERS: { symbol: string; min: number; max: number }[] = [
  { symbol: "$", min: 0, max: 5000 },
  { symbol: "$$", min: 5000, max: 15000 },
  { symbol: "$$$", min: 15000, max: 30000 },
  { symbol: "$$$$", min: 30000, max: 60000 },
  { symbol: "$$$$$", min: 60000, max: Infinity },
];

export function priceTierSymbol(min: number | null): string | null {
  if (min == null) return null;
  return PRICE_TIERS.find((t) => min >= t.min && min < t.max)?.symbol ?? null;
}

// Renders a from/to pair as e.g. "$$" (same tier) or "$ – $$$" (different
// tiers) — falls back to whichever side is actually set.
export function priceTierRangeLabel(min: number | null, max: number | null): string | null {
  const from = priceTierSymbol(min);
  const to = priceTierSymbol(max);
  if (!from) return to;
  if (!to || to === from) return from;
  return `${from} – ${to}`;
}
