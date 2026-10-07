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

export type TemplateLayout = "arch" | "split" | "banner" | "stack" | "frame" | "gradient" | "dark" | "editorial" | "monogram" | "polaroid" | "photo-left";

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
  decoration?: "floral" | "greenery" | "blooms" | "branch" | "daisy" | "wildflower" | "umbel" | "sprig";
  // How the whole page is laid out until the couple picks otherwise in the editor.
  pageLayout?: "scroll" | "split" | "nav";
  // Sample photo shown in this template's gallery thumbnail and live preview (and a second one
  // for templates that show two, like Polaroid Summer). Not the couple's photo.
  preview?: string;
  previewAlt?: string;
  // Where the people are in the sample photo ("x% y%"), so a cropped thumbnail keeps them in frame.
  previewFocus?: string;
  // Seeds the hero's photo placement (full-width by default; "left"/"right" makes it a side-by-side
  // photo band).
  heroLayout?: "left" | "right" | "top" | "overlay";
  // For the "overlay" cover: where the text sits on the photo.
  heroAlign?: "left" | "center" | "right";
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
  { ...S.hero, defaultContent: { eyebrow: "Together with their families", tagline: "are getting married", imageLayout: "top", showDate: true, showLocation: true, showCountdown: true, showRsvp: true } },
  { ...S.header, defaultContent: { tagline: "" } },
  { ...S.footer, defaultContent: { text: "" } },
  { ...S.text, defaultContent: { body: "Write anything you like here.", align: "center" } },
  { ...S.shape, defaultContent: { kind: "line" } },
  { ...S.image, defaultContent: { shape: "full", size: "m" } },
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
  { id: "pearl-wine", heroLayout: "left", preview: "/templates/photos/p45.jpg", previewFocus: "50% 30%", name: "Pearl & Wine", desc: "WedThread signature: pearl, cream, cherry.", layout: "photo-left", palette: { bg: "#FDFCF7", ink: "#1A1512", accent: "#E63950", soft: "#F7F1E3" }, fonts: { display: "Fraunces", body: "Instrument Sans" }, sections: ["hero", "story", "events", "gallery", "registry", "rsvp"] },
  {
    id: "garden-romance", heroLayout: "overlay", heroAlign: "right", preview: "/templates/photos/p43.jpg", previewFocus: "50% 45%", name: "Garden Romance", desc: "Lush greenery, warm blooms, and a quiet romantic hush.",
    layout: "editorial",
    palette: { bg: "#FBF7EF", ink: "#25302A", accent: "#C97D5D", soft: "#E7EBE0" },
    fonts: { display: "Cormorant Garamond", body: "Work Sans" },
    sections: ["hero", "story", "image", "events", "gallery", "registry", "rsvp"],
    images: {
      hero: "/templates/garden-romance/hero.jpg",
      image: "/templates/garden-romance/bouquet.jpg",
    },
  },
];

const BASIC = ["hero", "story", "events", "gallery", "registry", "rsvp"] as SectionType[];

// More starting points, in the spirit of Joy's gallery: each differs in palette, type, how the
// opening screen is composed (see TemplateThumb) and, for a few, the page layout it starts in.
TEMPLATES.push(
  { id: "sunset-terrace", heroLayout: "left", preview: "/templates/photos/p46.jpg", previewFocus: "50% 62%", name: "Sunset Terrace", desc: "Warm terracotta, a big photo and an easy golden-hour feel.", layout: "split",
    palette: { bg: "#B65A3A", ink: "#FFF4EA", accent: "#FFD7B5", soft: "#C46B49" }, fonts: { display: "Playfair Display", body: "Karla" },
    sections: BASIC, images: { hero: "/templates/photos/p46.jpg" }, pageLayout: "split", },
  { id: "coastline", heroLayout: "top", preview: "/templates/photos/p44.jpg", previewFocus: "55% 36%", name: "Coastline", desc: "Sea-glass blues and a wide photo under a light script.", layout: "banner",
    palette: { bg: "#EEF3F2", ink: "#23393D", accent: "#5F8F95", soft: "#D9E6E5" }, fonts: { display: "Cormorant Garamond", body: "Jost" }, sections: BASIC },
  { id: "ivy-arch", heroLayout: "overlay", heroAlign: "left", preview: "/templates/photos/p50.jpg", previewFocus: "50% 42%", name: "Ivy Arch", desc: "A soft sage ground with your photo set in an arch.", layout: "arch",
    palette: { bg: "#F7F5EE", ink: "#2C3A2E", accent: "#7A8F6B", soft: "#E3E8D8" }, fonts: { display: "Cormorant", body: "Mulish" }, sections: BASIC },
  { id: "olive-monogram", name: "Olive Monogram", desc: "Deep olive, cream lettering and a bold monogram.", layout: "monogram",
    palette: { bg: "#5F6B4F", ink: "#F6F1E4", accent: "#E8D9A8", soft: "#707C5F" }, fonts: { display: "Cinzel", body: "Work Sans" },
    sections: ["hero", "story", "events", "registry", "rsvp"], pageLayout: "nav" },
  { id: "midnight-film", heroLayout: "left", preview: "/templates/photos/p52.jpg", previewFocus: "65% 45%", name: "Midnight Film", desc: "Cinematic and dark, with the photo front and centre.", layout: "dark",
    palette: { bg: "#101216", ink: "#F4F1EA", accent: "#D9B26F", soft: "#1B1E24" }, fonts: { display: "Bodoni Moda", body: "Manrope" },
    sections: BASIC, images: { hero: "/templates/photos/p52.jpg" }, pageLayout: "split", },
  { id: "watercolour-dawn", name: "Watercolour Dawn", desc: "Blush and lilac washes with graceful handwritten names.", layout: "gradient",
    palette: { bg: "#FFF6F6", ink: "#4A3B4F", accent: "#C58BA3", soft: "#EFE3F1" }, fonts: { display: "Great Vibes", body: "Nunito" }, sections: BASIC },
  { id: "eucalyptus-frame", heroLayout: "top", preview: "/templates/photos/p51.jpg", previewFocus: "50% 40%", name: "Eucalyptus Frame", desc: "Clean white, framed by hand-drawn eucalyptus leaves.", layout: "frame",
    palette: { bg: "#FFFFFF", ink: "#26352E", accent: "#6E9B84", soft: "#EAF1EC" }, fonts: { display: "Marcellus", body: "Mulish" }, sections: BASIC },
  { id: "polaroid-summer", heroLayout: "top", preview: "/templates/photos/p41.jpg", previewFocus: "50% 40%", previewAlt: "/templates/photos/p40.jpg", name: "Polaroid Summer", desc: "Sunny yellow, relaxed and full of snapshots.", layout: "polaroid",
    palette: { bg: "#FFFDF4", ink: "#2B2A33", accent: "#F2B632", soft: "#FFF1BF" }, fonts: { display: "Caveat", body: "Poppins" }, sections: BASIC },
  { id: "gilded-ivory", heroLayout: "top", preview: "/templates/photos/p47.jpg", previewFocus: "50% 45%", name: "Gilded Ivory", desc: "Ivory and gold, formal and timeless.", layout: "stack",
    palette: { bg: "#FBF8F0", ink: "#2A2418", accent: "#B8924A", soft: "#F0E8D3" }, fonts: { display: "Libre Baskerville", body: "Lato" }, sections: BASIC },
  { id: "cherry-blossom", heroLayout: "top", preview: "/templates/photos/p42.jpg", previewFocus: "50% 42%", name: "Cherry Blossom", desc: "Petal pink and a spring-garden softness.", layout: "banner",
    palette: { bg: "#FFF4F6", ink: "#4B2E37", accent: "#D9788F", soft: "#FBDDE4" }, fonts: { display: "Prata", body: "Quicksand" }, sections: BASIC },
);

TEMPLATES.push(
  { id: "alpine-wreath", heroLayout: "left", preview: "/templates/photos/p48.jpg", previewFocus: "50% 40%", name: "Alpine Wreath", desc: "Evergreen sprays framing a moody, photo-led page.", layout: "editorial",
    palette: { bg: "#FBF8F1", ink: "#22302A", accent: "#5C8467", soft: "#E3EBE0" }, fonts: { display: "Parisienne", body: "Karla" },
    sections: BASIC, images: { hero: "/templates/photos/p48.jpg" }, pageLayout: "split", decoration: "greenery" },
  { id: "burgundy-blooms", heroLayout: "left", preview: "/templates/photos/p49.jpg", previewFocus: "50% 35%", name: "Burgundy Blooms", desc: "Watercolour burgundy and blush flowers, romantic and rich.", layout: "editorial",
    palette: { bg: "#FFF9F7", ink: "#3B1F26", accent: "#8E2F45", soft: "#F8E4E4" }, fonts: { display: "Playfair Display", body: "Nunito" },
    sections: BASIC, images: { hero: "/templates/photos/p49.jpg" }, pageLayout: "split", decoration: "blooms" },
  { id: "quiet-blossom", name: "Quiet Blossom", desc: "Minimal white with a single blossoming branch in soft sage.", layout: "monogram",
    palette: { bg: "#FFFFFF", ink: "#1C1C1C", accent: "#7C8F6A", soft: "#F4F5EE" }, fonts: { display: "Quicksand", body: "Quicksand" },
    sections: ["hero", "story", "events", "registry", "rsvp"], pageLayout: "nav", decoration: "branch" },);
TEMPLATES.push(
  { id: "rose-garden", heroLayout: "left", preview: "/templates/photos/p58.jpg", previewFocus: "50% 45%", name: "Rose Garden", desc: "Soft pink roses and a tender, old-world romance.", layout: "editorial",
    palette: { bg: "#FFF7F7", ink: "#4A2B33", accent: "#C96B80", soft: "#F9E1E4" }, fonts: { display: "Cormorant Garamond", body: "Karla" },
    sections: BASIC, images: { hero: "/templates/photos/p58.jpg" }, pageLayout: "split", },
  { id: "golden-hour-sea", heroLayout: "overlay", heroAlign: "center", preview: "/templates/photos/p59.jpg", previewFocus: "50% 40%", name: "Golden Hour Sea", desc: "A glowing sunset over the water, warm and cinematic.", layout: "dark",
    palette: { bg: "#1B1416", ink: "#FFF3E6", accent: "#F29E6B", soft: "#2B1E20" }, fonts: { display: "Marcellus", body: "Jost" },
    sections: BASIC, images: { hero: "/templates/photos/p59.jpg" }, },
  { id: "bouquet-blush", heroLayout: "top", preview: "/templates/photos/p60.jpg", previewFocus: "55% 34%", name: "Bouquet Blush", desc: "Powder pink and ribbon peach, light and airy.", layout: "arch",
    palette: { bg: "#FFF8F6", ink: "#4B3340", accent: "#C48A9A", soft: "#F3DFE3" }, fonts: { display: "Italiana", body: "Mulish" }, sections: BASIC },
  { id: "grand-estate", heroLayout: "top", preview: "/templates/photos/p61.jpg", previewFocus: "50% 55%", name: "Grand Estate", desc: "Ivory, navy and gold for a palace-garden celebration.", layout: "banner",
    palette: { bg: "#FBF9F4", ink: "#1F2A44", accent: "#B8924A", soft: "#EDE7D8" }, fonts: { display: "EB Garamond", body: "Raleway" }, sections: BASIC },
);

TEMPLATES.push(
  { id: "twig-and-bloom", heroLayout: "overlay", heroAlign: "center", preview: "/templates/photos/p40.jpg", previewFocus: "50% 38%", name: "Twig & Bloom", desc: "Crisp white with a single blossoming twig in fine ink.", layout: "stack",
    palette: { bg: "#FFFFFF", ink: "#1B1B1B", accent: "#2F2F2F", soft: "#F3F3F1" }, fonts: { display: "Cormorant Garamond", body: "Jost" }, sections: BASIC, decoration: "branch" },
  { id: "daisy-chain", heroLayout: "overlay", heroAlign: "left", preview: "/templates/photos/p50.jpg", previewFocus: "50% 42%", name: "Daisy Chain", desc: "Warm cream and honey, with big hand-drawn daisies.", layout: "banner",
    palette: { bg: "#FFFDF6", ink: "#2E2A22", accent: "#C99A36", soft: "#FBF0CF" }, fonts: { display: "Playfair Display", body: "Nunito" }, sections: BASIC, decoration: "daisy" },
  { id: "meadow-stem", heroLayout: "overlay", heroAlign: "right", preview: "/templates/photos/p43.jpg", previewFocus: "50% 45%", name: "Meadow Stem", desc: "Tall wildflower stems on a quiet, natural ground.", layout: "arch",
    palette: { bg: "#F8F6F1", ink: "#2D3A2C", accent: "#6B7F5A", soft: "#E6EBDD" }, fonts: { display: "Cormorant", body: "Karla" }, sections: BASIC, decoration: "wildflower" },
  { id: "wild-carrot", heroLayout: "overlay", heroAlign: "center", preview: "/templates/photos/p42.jpg", previewFocus: "50% 42%", name: "Wild Carrot", desc: "Delicate seed-heads and grasses in dusty mauve.", layout: "frame",
    palette: { bg: "#FAF7F5", ink: "#3A2F33", accent: "#9A6B7A", soft: "#EFE3E6" }, fonts: { display: "Marcellus", body: "Mulish" }, sections: BASIC, decoration: "umbel" },
  { id: "berry-sprig", heroLayout: "left", preview: "/templates/photos/p47.jpg", previewFocus: "50% 45%", name: "Berry Sprig", desc: "Fresh white with a leafy, berried sprig in forest green.", layout: "split",
    palette: { bg: "#FFFFFF", ink: "#223A33", accent: "#3E6B57", soft: "#E5EFEA" }, fonts: { display: "Libre Baskerville", body: "Work Sans" }, sections: BASIC, decoration: "sprig" },
);

// Eucalyptus Frame draws its leaves on the real site too.
TEMPLATES.find((t) => t.id === "eucalyptus-frame")!.decoration = "greenery";

// Gallery order: the three cover styles (photo left / photo on top / text over photo) and the three
// text positions on the overlay ones are interleaved, so neighbouring cards never look alike, with the
// photo-less designs dropped in between.
const GALLERY_ORDER = [
  "pearl-wine", "coastline", "garden-romance",
  "sunset-terrace", "olive-monogram", "gilded-ivory", "ivy-arch",
  "midnight-film", "cherry-blossom", "golden-hour-sea",
  "alpine-wreath", "polaroid-summer", "watercolour-dawn", "meadow-stem",
  "burgundy-blooms", "eucalyptus-frame", "daisy-chain",
  "rose-garden", "grand-estate", "wild-carrot",
  "berry-sprig", "bouquet-blush", "quiet-blossom", "twig-and-bloom",
];
TEMPLATES.sort((a, b) => {
  const ia = GALLERY_ORDER.indexOf(a.id), ib = GALLERY_ORDER.indexOf(b.id);
  return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
});

export const getTemplate = (id?: string | null) =>
  TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
