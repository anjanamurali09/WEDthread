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

export type TemplateLayout = "arch" | "split" | "banner" | "stack" | "frame" | "gradient" | "dark" | "editorial" | "monogram" | "polaroid";

export type Template = {
  id: string;
  name: string;
  desc: string;
  layout: TemplateLayout;
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
  { ...S.story, defaultContent: { title: "Our story", body: "Tell your love story here: how you met, the proposal, the little moments in between." } },
  { ...S.events, defaultContent: { title: "Celebrations" } },
  { ...S.gallery, defaultContent: { title: "Moments", images: [] } },
  { ...S.party, defaultContent: { title: "Wedding party", members: [] } },
  { ...S.travel, defaultContent: { title: "Travel & stay", body: "Recommended hotels, transport tips, and things to do while you're in town." } },
  { ...S.registry, defaultContent: { title: "Registry", body: "Your presence is our gift. If you'd like to give more, here are a few suggestions." } },
  { ...S.rsvp, defaultContent: { title: "RSVP", body: "Please respond by the date on your invitation." } },
  { ...S.faq, defaultContent: { title: "FAQ", items: [{ q: "What's the dress code?", a: "Festive garden attire." }] } },
  { ...S.quote, defaultContent: { text: "And they lived happily ever after.", author: "" } },
];

// Palettes tuned for high saturation and clear differentiation between
// templates (inspired by joy.com's template gallery). Each `bg` is the hero
// panel color; `ink` is the readable text on it; `accent` is the accent for
// buttons and small text; `soft` is the secondary section background.
export const TEMPLATES: Template[] = [
  { id: "emerald-city",      name: "Emerald City",        desc: "Deep emerald hero, ivory type, gold accents.",       layout: "arch",      palette: { bg: "#0F4C3A", ink: "#F7F1E3", accent: "#E4C079", soft: "#DCE7DE" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","travel","rsvp"] },
  { id: "nelson-green",      name: "Nelson",              desc: "Vivid grass green with warm mocha photo blocks.",    layout: "split",     palette: { bg: "#1FA463", ink: "#FFFFFF", accent: "#B47344", soft: "#EAF7EE" }, fonts: { display: "Instrument Sans", body: "Instrument Sans" }, sections: ["hero","events","story","registry","rsvp"] },
  { id: "minimalist-mocha",  name: "Minimalist Mocha",    desc: "Warm mocha brown, arched photo, cream type.",        layout: "arch",      palette: { bg: "#8C5A3C", ink: "#F5EDDF", accent: "#F2D9B8", soft: "#E9D9C6" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","travel","gallery","rsvp"] },
  { id: "magazine-pink",     name: "Magazine",            desc: "Bubblegum pink with a coral date, editorial grid.",  layout: "editorial", palette: { bg: "#F7BFD1", ink: "#B23A6B", accent: "#E14B7B", soft: "#FFE3EC" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","party","gallery","travel","rsvp"] },
  { id: "lydia-noir",        name: "Lydia",               desc: "Cinematic dark botanical photo, ivory serif.",       layout: "dark",      palette: { bg: "#141816", ink: "#F5EFE2", accent: "#C9A84C", soft: "#242927" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","quote","events","gallery","rsvp"] },
  { id: "tourmaline",        name: "Tourmaline",          desc: "Sunset orange-to-magenta gradient.",                 layout: "gradient",  palette: { bg: "#F76B4A", ink: "#FFFFFF", accent: "#FFD65C", soft: "#FFC1B2" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","rsvp"] },
  { id: "felicity-olive",    name: "Felicity Olive",      desc: "Olive green with a monogram serif logotype.",        layout: "monogram",  palette: { bg: "#7A8A5C", ink: "#F5EFE2", accent: "#E9DFC5", soft: "#DDE0C9" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","travel","registry","rsvp"] },
  { id: "camellia-garden",   name: "Camellia Garden",     desc: "Ivory hero framed with painted florals.",            layout: "frame",     palette: { bg: "#F5EDDD", ink: "#3B4A34", accent: "#B96E7C", soft: "#EAD6D2" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","party","rsvp"] },
  { id: "logan-parker-navy", name: "Logan & Parker",      desc: "Rich navy with a gold monogram crest.",              layout: "monogram",  palette: { bg: "#0F1B3D", ink: "#F0E6D1", accent: "#C9A84C", soft: "#1E2A5C" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","story","rsvp"] },
  { id: "logan-dimitra",     name: "Logan & Dimitra",     desc: "Soft blush watercolor florals, ivory center.",       layout: "frame",     palette: { bg: "#FCEFEA", ink: "#6B3A48", accent: "#D68CA0", soft: "#F5D6D3" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","rsvp"] },
  { id: "janelle-ethan",     name: "Janelle & Ethan",     desc: "Sunbeam yellow banner, denim-blue photo.",           layout: "banner",    palette: { bg: "#FFE04D", ink: "#0E5A9E", accent: "#0E5A9E", soft: "#FFF4B3" }, fonts: { display: "Instrument Sans", body: "Instrument Sans" }, sections: ["hero","events","story","registry","rsvp"] },
  { id: "chelsea-oscar",     name: "Chelsea & Oscar",     desc: "Marble ivory with gold-leaf accents.",               layout: "stack",     palette: { bg: "#E9E1D0", ink: "#3E2E20", accent: "#B18A4A", soft: "#D9CBB0" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","travel","registry","rsvp"] },
  { id: "violet-patrick",    name: "Violet & Patrick",    desc: "Kelly-green hero, split-photo, mocha border.",       layout: "split",     palette: { bg: "#1C8A3A", ink: "#FFFFFF", accent: "#D8A15B", soft: "#B87A3F" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","party","gallery","travel","rsvp"] },
  { id: "diana-jeffrey",     name: "Diana & Jeffrey",     desc: "Butter yellow banner, brick-red couple photo.",      layout: "banner",    palette: { bg: "#FFF3C2", ink: "#B22C1A", accent: "#B22C1A", soft: "#F9DFA8" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","rsvp"] },
  { id: "brianna-gregory",   name: "Brianna & Gregory",   desc: "Bubblegum pink editorial with photo grid.",          layout: "editorial", palette: { bg: "#F9BAC5", ink: "#8E2C48", accent: "#E86A33", soft: "#FCE0E5" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","party","gallery","travel","rsvp"] },
  { id: "zara-dylan",        name: "Zara & Dylan",        desc: "Moody black-rose backdrop, ivory serif.",            layout: "dark",      palette: { bg: "#1F1B1C", ink: "#F5EFE2", accent: "#D0A6A6", soft: "#2E2828" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","quote","events","gallery","rsvp"] },
  { id: "ebba-alessandro",   name: "Ebba & Alessandro",   desc: "Ivory arch framed by lush painted garden.",          layout: "arch",      palette: { bg: "#F5EFE2", ink: "#254C33", accent: "#B75E3B", soft: "#D9E4D0" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","travel","rsvp"] },
  { id: "chloe-lucas",       name: "Chloe & Lucas",       desc: "Warm greige with silver-leaf botanical overlay.",    layout: "polaroid",  palette: { bg: "#DED4C4", ink: "#4A5240", accent: "#8B7A5E", soft: "#EDE7D9" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","registry","rsvp"] },
  { id: "celine-daniel",     name: "Céline & Daniel",     desc: "Neon-lime type over hot-pink to peach gradient.",    layout: "gradient",  palette: { bg: "#F55D7A", ink: "#EEFF6B", accent: "#EEFF6B", soft: "#FF9E7C" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","events","story","rsvp"] },
  { id: "pearl-wine",        name: "Pearl & Wine",        desc: "Vowzy signature: pearl, cream, cherry.",            layout: "stack",     palette: { bg: "#FDFCF7", ink: "#1A1512", accent: "#E63950", soft: "#F7F1E3" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero","story","events","gallery","registry","rsvp"] },
];

export const getTemplate = (id?: string | null) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
