// 20 wedding website templates. Each defines a palette, font pair, and default section blueprint.
// The editor lets couples override text, photos, and toggle sections. `w/$slug` renders from
// website_sections joined against these template presets.

export type SectionType =
  | "hero"
  | "story"
  | "events"
  | "gallery"
  | "party"
  | "travel"
  | "registry"
  | "rsvp"
  | "faq"
  | "quote";

export type SectionDef = {
  type: SectionType;
  label: string;
  defaultContent: Record<string, any>;
};

export type Template = {
  id: string;
  name: string;
  desc: string;
  palette: { bg: string; ink: string; accent: string; soft: string };
  fonts: { display: string; body: string };
  sections: SectionType[];
};

const S = {
  hero: { type: "hero" as const, label: "Hero" },
  story: { type: "story" as const, label: "Our story" },
  events: { type: "events" as const, label: "Events" },
  gallery: { type: "gallery" as const, label: "Gallery" },
  party: { type: "party" as const, label: "Wedding party" },
  travel: { type: "travel" as const, label: "Travel & stay" },
  registry: { type: "registry" as const, label: "Registry" },
  rsvp: { type: "rsvp" as const, label: "RSVP" },
  faq: { type: "faq" as const, label: "FAQ" },
  quote: { type: "quote" as const, label: "Quote" },
};

export const SECTION_LIBRARY: SectionDef[] = [
  { ...S.hero, defaultContent: { eyebrow: "Together with their families", tagline: "are getting married" } },
  { ...S.story, defaultContent: { title: "Our story", body: "Tell your love story here — how you met, the proposal, the little moments in between." } },
  { ...S.events, defaultContent: { title: "Celebrations" } },
  { ...S.gallery, defaultContent: { title: "Moments", images: [] } },
  { ...S.party, defaultContent: { title: "Wedding party", members: [] } },
  { ...S.travel, defaultContent: { title: "Travel & stay", body: "Recommended hotels, transport tips, and things to do while you're in town." } },
  { ...S.registry, defaultContent: { title: "Registry", body: "Your presence is our gift. If you'd like to give more, here are a few suggestions." } },
  { ...S.rsvp, defaultContent: { title: "RSVP", body: "Please respond by the date on your invitation." } },
  { ...S.faq, defaultContent: { title: "FAQ", items: [{ q: "What's the dress code?", a: "Festive garden attire." }] } },
  { ...S.quote, defaultContent: { text: "And they lived happily ever after.", author: "" } },
];

export const TEMPLATES: Template[] = [
  { id: "editorial-serif",   name: "Editorial Serif",     desc: "Big headline, tall hero, generous margins.", palette: { bg: "#FDFCF7", ink: "#1A1512", accent: "#6B0F1A", soft: "#F7F1E3" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","travel","rsvp"] },
  { id: "modern-minimal",    name: "Modern Minimal",      desc: "Quiet sans-serif on cream.",                 palette: { bg: "#FFFFFF", ink: "#111111", accent: "#C21E38", soft: "#F4F4F4" }, fonts: { display: "Instrument Sans", body: "Instrument Sans" }, sections: ["hero","events","story","registry","rsvp"] },
  { id: "coastal-warm",      name: "Coastal Warm",        desc: "Sandy beige, ocean blue, breezy.",           palette: { bg: "#F5EDE0", ink: "#22546B", accent: "#E9B27C", soft: "#EFE4CE" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","travel","gallery","rsvp"] },
  { id: "mehendi-mosaic",    name: "Mehendi Mosaic",      desc: "Deep green with gold accents.",              palette: { bg: "#FFF6E5", ink: "#0F3D2E", accent: "#D9B67B", soft: "#F5E9C7" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","party","gallery","travel","rsvp"] },
  { id: "romantic-blush",    name: "Romantic Blush",      desc: "Pale pink, script accent, floral edges.",    palette: { bg: "#FBEEEA", ink: "#8B4B4B", accent: "#E9C7BA", soft: "#F5DED4" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","rsvp"] },
  { id: "night-garden",      name: "Night Garden",        desc: "Dark charcoal, gold text, botanical.",       palette: { bg: "#171817", ink: "#F0E6D1", accent: "#E4C079", soft: "#2A2B2A" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","quote","events","gallery","rsvp"] },
  { id: "kraft-journal",     name: "Kraft Journal",       desc: "Paper texture, hand-drawn feel.",            palette: { bg: "#EFE5D2", ink: "#4A3520", accent: "#B4854B", soft: "#E4D6BC" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","party","travel","rsvp"] },
  { id: "arabesque-lux",     name: "Arabesque Lux",       desc: "Cream with maroon geometric motifs.",        palette: { bg: "#F4EBDD", ink: "#5B1A24", accent: "#C79A5B", soft: "#EAD8BE" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","gallery","party","registry","rsvp"] },
  { id: "citrus-bloom",      name: "Citrus Bloom",        desc: "Playful mustard, coral, off-white.",         palette: { bg: "#FEF8EC", ink: "#231F20", accent: "#E86A33", soft: "#F5E2B8" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","rsvp"] },
  { id: "sanskrit-modern",   name: "Sanskrit Modern",     desc: "Devanagari-friendly, saffron accents.",      palette: { bg: "#FFF7EC", ink: "#231F20", accent: "#E76F00", soft: "#F5E4C7" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","party","travel","rsvp"] },
  { id: "pearl-wine",        name: "Pearl & Wine",        desc: "Vowzy signature — pearl, cream, wine.",      palette: { bg: "#FDFCF7", ink: "#1A1512", accent: "#6B0F1A", soft: "#F7F1E3" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","registry","rsvp"] },
  { id: "olive-terracotta",  name: "Olive & Terracotta",  desc: "Mediterranean, earthy, warm.",               palette: { bg: "#F3EDDD", ink: "#3D4A2A", accent: "#B75E3B", soft: "#E6DBBF" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","travel","gallery","rsvp"] },
  { id: "midnight-linen",    name: "Midnight Linen",      desc: "Navy, cream, understated.",                  palette: { bg: "#F5EFE2", ink: "#132039", accent: "#8E6E4B", soft: "#E7DDC5" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","registry","rsvp"] },
  { id: "silk-rose",         name: "Silk Rose",           desc: "Dusty rose, muted, elegant.",                palette: { bg: "#F7EAE6", ink: "#4A2E2E", accent: "#B96E7C", soft: "#EED6D1" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","party","rsvp"] },
  { id: "sunset-marigold",   name: "Sunset Marigold",     desc: "South-Asian marigold and magenta.",          palette: { bg: "#FFF3E6", ink: "#2B0F1E", accent: "#E14B7B", soft: "#FFD8A8" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","party","gallery","travel","rsvp"] },
  { id: "chapel-cream",      name: "Chapel Cream",        desc: "Church-wedding classic, ivory & sage.",      palette: { bg: "#FBF6EA", ink: "#2E3B2F", accent: "#8B9670", soft: "#EDE4CB" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","quote","events","story","rsvp"] },
  { id: "vineyard-plum",     name: "Vineyard Plum",       desc: "Deep plum, cream, vineyard vibe.",           palette: { bg: "#F5EFE6", ink: "#3B1D2E", accent: "#7C3A56", soft: "#E9DACB" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","travel","registry","rsvp"] },
  { id: "boho-desert",       name: "Boho Desert",         desc: "Sand, clay, sage, minimal.",                 palette: { bg: "#F1E6D3", ink: "#5C3A1E", accent: "#C48E5A", soft: "#E4D3B4" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","travel","rsvp"] },
  { id: "monogram-black",    name: "Monogram Black",      desc: "Black, ivory, single monogram accent.",      palette: { bg: "#F6F1E6", ink: "#0E0E0E", accent: "#B18A4A", soft: "#EAE1CB" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","story","rsvp"] },
  { id: "garden-fern",       name: "Garden Fern",         desc: "Fern green, cream, botanical prints.",       palette: { bg: "#F1EEDE", ink: "#2F4432", accent: "#A0673E", soft: "#E1E2C4" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","party","rsvp"] },
];

export const getTemplate = (id?: string | null) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
