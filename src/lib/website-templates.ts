// 20 wedding website templates. Each defines a palette, font pair, and default section blueprint.
// The editor lets couples override text, photos, and toggle sections. `w/$slug` renders from
// website_sections joined against these template presets.

export type SectionType =
  | "hero"
  | "header"
  | "footer"
  | "text"
  | "shape"
  | "image"
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

export type TemplateLayout = "arch" | "split" | "banner" | "stack" | "frame" | "gradient" | "dark" | "editorial" | "monogram" | "polaroid";

export type Template = {
  id: string;
  name: string;
  desc: string;
  layout: TemplateLayout;
  palette: { bg: string; ink: string; accent: string; soft: string };
  fonts: { display: string; body: string };
  sections: SectionType[];
  // Default photo per section type, seeded as that section's image_url when a couple
  // first picks this template — keyed by type since a template only ever seeds one of
  // each section. Static files bundled in public/templates/<id>/, not Supabase Storage —
  // these are fixed template assets, not user uploads, so they ship with the app itself.
  images?: Partial<Record<SectionType, string>>;
  // Opt-in decorative accent drawn by RenderSection for templates that want a distinct
  // visual identity beyond font/color/photo — hand-authored SVGs only (self-drawn, so no
  // sourcing/licensing question), not a general effects system.
  decoration?: "floral";
};

const S = {
  hero: { type: "hero" as const, label: "Hero" },
  header: { type: "header" as const, label: "Header" },
  footer: { type: "footer" as const, label: "Footer" },
  text: { type: "text" as const, label: "Text box" },
  shape: { type: "shape" as const, label: "Shape" },
  image: { type: "image" as const, label: "Image" },
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
  { ...S.hero, defaultContent: { eyebrow: "Together with their families", tagline: "are getting married", imageLayout: "full" } },
  { ...S.header, defaultContent: { tagline: "" } },
  { ...S.footer, defaultContent: { text: "" } },
  { ...S.text, defaultContent: { body: "Write anything you like here.", align: "center" } },
  { ...S.shape, defaultContent: { kind: "line" } },
  { ...S.image, defaultContent: { shape: "rectangle", size: "m" } },
  { ...S.story, defaultContent: { title: "Our story", body: "Tell your love story here: how you met, the proposal, the little moments in between.", imageLayout: "full" } },
  { ...S.events, defaultContent: { title: "Celebrations", hiddenEventIds: [] } },
  { ...S.gallery, defaultContent: { title: "Moments", images: [] } },
  { ...S.party, defaultContent: { title: "Wedding party", members: [] } },
  { ...S.travel, defaultContent: { title: "Travel & stay", body: "Recommended hotels, transport tips, and things to do while you're in town.", imageLayout: "full" } },
  { ...S.registry, defaultContent: { title: "Registry", body: "Your presence is our gift. If you'd like to give more, here are a few suggestions.", imageLayout: "full" } },
  { ...S.rsvp, defaultContent: { title: "RSVP", body: "Please respond by the date on your invitation.", imageLayout: "full" } },
  { ...S.faq, defaultContent: { title: "FAQ", items: [{ q: "What's the dress code?", a: "Festive garden attire." }] } },
  { ...S.quote, defaultContent: { text: "And they lived happily ever after.", author: "" } },
];

// Palettes tuned for high saturation and clear differentiation between
// templates (inspired by joy.com's template gallery). Each `bg` is the hero
// panel color; `ink` is the readable text on it; `accent` is the accent for
// buttons and small text; `soft` is the secondary section background.
export const TEMPLATES: Template[] = [
  { id: "pearl-wine", name: "Pearl & Wine", desc: "WedThread signature: pearl, cream, cherry.", layout: "stack", palette: { bg: "#FDFCF7", ink: "#1A1512", accent: "#E63950", soft: "#F7F1E3" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero", "story", "events", "gallery", "registry", "rsvp"] },
  {
    id: "garden-romance", name: "Garden Romance", desc: "Lush greenery, warm blooms, and a quiet romantic hush.",
    layout: "editorial",
    palette: { bg: "#FBF7EF", ink: "#25302A", accent: "#C97D5D", soft: "#E7EBE0" },
    fonts: { display: "Cormorant Garamond", body: "Work Sans" },
    sections: ["hero", "story", "image", "events", "gallery", "registry", "rsvp"],
    images: {
      hero: "/templates/garden-romance/hero.jpg",
      image: "/templates/garden-romance/bouquet.jpg",
    },
    decoration: "floral",
  },
];

export const getTemplate = (id?: string | null) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
