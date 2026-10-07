// Dietary / allergen tags are a per-wedding library (the food_tags table) the couple can
// add to, rename, recolour and delete. These defaults are only what a wedding starts with
// (and what the app falls back to before the table exists / while it loads).
export type FoodKind = "diet" | "allergy";
export type FoodTagLike = { name: string; kind: string; abbr: string | null; color?: string; emoji?: string | null };

export const DIET_COLOR = "#6E9B72";
export const ALLERGY_COLOR = "#E0805F";

// Restaurant-menu shorthand: diet type as a lowercase letter code right after the dish
// name (the universal convention — (v), (vg), (gf)…), allergens as a separate uppercase
// code since they're a warning, not a diet.
export const DEFAULT_FOOD_TAGS: { name: string; kind: FoodKind; abbr: string }[] = [
  { name: "Vegetarian", kind: "diet", abbr: "v" },
  { name: "Vegan", kind: "diet", abbr: "vg" },
  { name: "Halal", kind: "diet", abbr: "h" },
  { name: "Kosher", kind: "diet", abbr: "k" },
  { name: "Jain", kind: "diet", abbr: "j" },
  { name: "Gluten-free", kind: "diet", abbr: "gf" },
  { name: "Pescatarian", kind: "diet", abbr: "pesc" },
  { name: "Nuts", kind: "allergy", abbr: "N" },
  { name: "Dairy", kind: "allergy", abbr: "D" },
  { name: "Shellfish", kind: "allergy", abbr: "Sh" },
  { name: "Eggs", kind: "allergy", abbr: "E" },
  { name: "Soy", kind: "allergy", abbr: "So" },
  { name: "Sesame", kind: "allergy", abbr: "Se" },
  { name: "Wheat", kind: "allergy", abbr: "W" },
];

// A short menu code for a newly created tag, avoiding codes already taken by the same kind:
// diets are lowercase initials ("Low carb" -> "lc") or the first letters of a single word,
// allergens an uppercase letter that grows by one character until it's unique.
export function autoAbbr(name: string, kind: FoodKind, taken: (string | null | undefined)[]): string {
  const clean = name.replace(/[^\p{L}\p{N} -]/gu, "").trim();
  const words = clean.split(/[\s-]+/).filter(Boolean);
  const used = new Set(taken.filter(Boolean).map((t) => t!.toLowerCase()));
  const fmt = (v: string) => (kind === "allergy" ? v.charAt(0).toUpperCase() + v.slice(1).toLowerCase() : v.toLowerCase());
  const base = words.length > 1 && kind === "diet" ? words.map((w) => w[0]).join("") : (words[0] ?? "x");
  const start = kind === "allergy" ? 1 : words.length > 1 ? base.length : Math.min(2, base.length);
  for (let n = start; n <= Math.max(base.length, start); n++) {
    const cand = fmt(base.slice(0, n));
    if (!used.has(cand.toLowerCase())) return cand;
  }
  return fmt(base) + "2";
}

export type FoodLookup = Map<string, FoodTagLike>;
export const foodLookup = (tags: FoodTagLike[]): FoodLookup => new Map(tags.map((t) => [t.name, t]));

// Splits a dish's tag names into diet codes and allergen codes, using the library.
export function dishCodes(names: string[], lookup: FoodLookup) {
  const diet: string[] = [], allergens: string[] = [];
  names.forEach((n) => {
    const t = lookup.get(n);
    if (!t?.abbr) return;
    (t.kind === "allergy" ? allergens : diet).push(t.abbr);
  });
  return { diet, allergens };
}

// "(vg) Vegan · (N) Nuts" for every tag actually used on the menu.
export function legendFor(usedNames: Iterable<string>, tags: FoodTagLike[]): string {
  const used = new Set(usedNames);
  return tags.filter((t) => used.has(t.name) && t.abbr).map((t) => `(${t.abbr}) ${t.name}`).join("   ·   ");
}
