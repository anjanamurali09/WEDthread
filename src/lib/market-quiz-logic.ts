import { PRICE_TIERS } from "@/lib/price-tiers";
import { inPlace, type Place } from "@/lib/market-place";
import { VENDOR_GROUPS } from "@/lib/vendor-groups";

// The thinking behind the quiz on the venue and vendor pages. Nobody knows what a venue "should" cost or which
// space they want, so the quiz asks about things people do know (a first date they loved, what they would never
// compromise on) and turns the answers into filters and an order of results here.

// ── Venues ───────────────────────────────────────────────────────────────

// "Pick your perfect first date": each answer stands for the kinds of venue space that feel like it.
export const FIRST_DATES = [
  { key: "dinner", label: "A candlelit dinner", note: "Cosy, dressed up, close to the people we love", spaces: ["Indoor", "Banquet hall"] },
  { key: "picnic", label: "A picnic and a hike", note: "Fresh air, long grass, no rush", spaces: ["Outdoor", "Farmhouse"] },
  { key: "pool", label: "A pool party", note: "Music, sunshine and a splash", spaces: ["Poolside", "Rooftop"] },
  { key: "sunset", label: "Sunset on the beach", note: "Bare feet and golden light", spaces: ["Beach"] },
] as const;

export const SIGNS = [
  { name: "Aries", dates: "Mar 21 – Apr 19", element: "fire" },
  { name: "Taurus", dates: "Apr 20 – May 20", element: "earth" },
  { name: "Gemini", dates: "May 21 – Jun 20", element: "air" },
  { name: "Cancer", dates: "Jun 21 – Jul 22", element: "water" },
  { name: "Leo", dates: "Jul 23 – Aug 22", element: "fire" },
  { name: "Virgo", dates: "Aug 23 – Sep 22", element: "earth" },
  { name: "Libra", dates: "Sep 23 – Oct 22", element: "air" },
  { name: "Scorpio", dates: "Oct 23 – Nov 21", element: "water" },
  { name: "Sagittarius", dates: "Nov 22 – Dec 21", element: "fire" },
  { name: "Capricorn", dates: "Dec 22 – Jan 19", element: "earth" },
  { name: "Aquarius", dates: "Jan 20 – Feb 18", element: "air" },
  { name: "Pisces", dates: "Feb 19 – Mar 20", element: "water" },
] as const;

const ELEMENT_SPACES: Record<string, string[]> = {
  fire: ["Rooftop", "Poolside"],
  earth: ["Farmhouse", "Outdoor"],
  air: ["Rooftop", "Outdoor"],
  water: ["Beach", "Poolside"],
};

export function spacesForDates(keys: string[]): string[] {
  return Array.from(new Set(FIRST_DATES.filter((d) => keys.includes(d.key)).flatMap((d) => [...d.spaces])));
}

export function spacesForSigns(signs: (string | null)[]): string[] {
  return signs.flatMap((n) => {
    const s = SIGNS.find((x) => x.name === n);
    return s ? ELEMENT_SPACES[s.element] : [];
  });
}

export type QuizVenue = {
  city: string | null; country: string | null; capacity_min: number | null; capacity_max: number | null;
  type_of_space: string[]; price_range_min: number | null; currency?: string | null; photos?: string[];
};

// A venue whose size is not listed is not ruled out.
export function fitsGuests(v: QuizVenue, guests: number | null) {
  if (!guests) return true;
  return guests >= (v.capacity_min ?? 0) && guests <= (v.capacity_max ?? Infinity);
}

export function tierIndex(price: number) {
  return PRICE_TIERS.findIndex((t) => price >= t.min && price < t.max);
}

// A venue with no price listed is not ruled out either.
export function fitsTiers(v: QuizVenue, tiers: string[]) {
  if (tiers.length === 0 || v.price_range_min == null) return true;
  return tiers.includes(String(tierIndex(v.price_range_min)));
}

function quantile(sorted: number[], q: number) {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export type BudgetEstimate = { low: number; high: number; count: number; tiers: number[]; stretchTiers: number[]; currency: string | null };

// What venues like theirs usually start from: the middle half of the listed prices of venues in the chosen place
// that can hold their guests. With fewer than three priced venues there is nothing honest to say, so no estimate.
export function estimateBudget(venues: QuizVenue[], place: Place, guests: number | null): BudgetEstimate | null {
  const priced = venues.filter((v) => inPlace(place, v.city, v.country) && fitsGuests(v, guests) && v.price_range_min != null);
  if (priced.length < 3) return null;
  const prices = priced.map((v) => v.price_range_min as number).sort((a, b) => a - b);
  const low = quantile(prices, 0.25), high = quantile(prices, 0.75);
  const from = Math.max(0, tierIndex(low)), to = Math.max(from, tierIndex(high));
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const currencies = new Set(priced.map((v) => v.currency).filter(Boolean));
  return {
    low, high, count: priced.length, tiers: range(from, to),
    stretchTiers: range(from, Math.min(PRICE_TIERS.length - 1, to + 1)),
    currency: currencies.size === 1 ? ([...currencies][0] as string) : null,
  };
}

export type VenueMatches<T> = { both: T[]; only1: T[]; only2: T[]; fits: T[] };

// Venues that suit both partners come first, then the ones closer to each partner's taste. The sun signs only
// change the order inside each group.
export function matchVenues<T extends QuizVenue>(
  venues: T[], o: { place: Place; guests: number | null; tiers: string[]; p1: string[]; p2: string[]; nudge: string[] },
): VenueMatches<T> {
  const fits = venues.filter((v) => inPlace(o.place, v.city, v.country) && fitsGuests(v, o.guests) && fitsTiers(v, o.tiers));
  const hits = (v: T, spaces: string[]) => v.type_of_space.some((t) => spaces.includes(t));
  const nudge = (v: T) => v.type_of_space.filter((t) => o.nudge.includes(t)).length;
  const order = (a: T, b: T) => nudge(b) - nudge(a) || Number((b.photos?.length ?? 0) > 0) - Number((a.photos?.length ?? 0) > 0);
  const both = fits.filter((v) => hits(v, o.p1) && hits(v, o.p2)).sort(order);
  const only1 = fits.filter((v) => hits(v, o.p1) && !hits(v, o.p2)).sort(order);
  const only2 = fits.filter((v) => hits(v, o.p2) && !hits(v, o.p1)).sort(order);
  return { both, only1, only2, fits: [...fits].sort(order) };
}

// ── Vendors ──────────────────────────────────────────────────────────────

export type Stance = "splurge" | "balanced" | "save";

export const STANCES: { key: Stance; label: string; tiers: string[] }[] = [
  { key: "splurge", label: "Splurge", tiers: ["2", "3", "4"] },
  { key: "balanced", label: "Somewhere in between", tiers: ["1", "2", "3"] },
  { key: "save", label: "Save", tiers: ["0", "1", "2"] },
];

export const stanceTiers = (s: Stance | undefined) => STANCES.find((x) => x.key === (s ?? "balanced"))!.tiers;

export const groupLabel = (key: string) => VENDOR_GROUPS.find((g) => g.key === key)?.label ?? key;

export type QuizVendor = { price_range_min: number | null; city?: string | null; country?: string | null; categoryNames: string[] };
