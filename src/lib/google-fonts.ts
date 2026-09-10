import { useEffect } from "react";

// A curated set of well-known free Google Fonts spanning the styles a wedding site
// actually reaches for — not Google's full 1500+ catalog (no API key is configured in
// this app to fetch that live list). Includes the 6 families src/routes/__root.tsx
// already pre-loads, so nothing regresses if a couple picks one of those.
export type FontGroup = "Serif" | "Sans" | "Script" | "Display";
export const GOOGLE_FONT_OPTIONS: { group: FontGroup; name: string }[] = [
  // Serif
  { group: "Serif", name: "Newsreader" },
  { group: "Serif", name: "Playfair Display" },
  { group: "Serif", name: "Cormorant Garamond" },
  { group: "Serif", name: "Cormorant" },
  { group: "Serif", name: "EB Garamond" },
  { group: "Serif", name: "Merriweather" },
  { group: "Serif", name: "Lora" },
  { group: "Serif", name: "Libre Baskerville" },
  { group: "Serif", name: "Crimson Text" },
  { group: "Serif", name: "Spectral" },
  { group: "Serif", name: "Fraunces" },
  { group: "Serif", name: "Bodoni Moda" },
  { group: "Serif", name: "Marcellus" },
  { group: "Serif", name: "Prata" },
  { group: "Serif", name: "Cardo" },
  { group: "Serif", name: "Vollkorn" },
  { group: "Serif", name: "PT Serif" },
  { group: "Serif", name: "Bitter" },
  { group: "Serif", name: "Domine" },
  { group: "Serif", name: "Cormorant Infant" },
  // Sans
  { group: "Sans", name: "Instrument Sans" },
  { group: "Sans", name: "Poppins" },
  { group: "Sans", name: "Montserrat" },
  { group: "Sans", name: "Raleway" },
  { group: "Sans", name: "Work Sans" },
  { group: "Sans", name: "Inter" },
  { group: "Sans", name: "Nunito" },
  { group: "Sans", name: "Quicksand" },
  { group: "Sans", name: "Karla" },
  { group: "Sans", name: "Mulish" },
  { group: "Sans", name: "Rubik" },
  { group: "Sans", name: "Outfit" },
  { group: "Sans", name: "Manrope" },
  { group: "Sans", name: "Space Grotesk" },
  { group: "Sans", name: "Jost" },
  { group: "Sans", name: "Josefin Sans" },
  { group: "Sans", name: "Lato" },
  { group: "Sans", name: "Open Sans" },
  { group: "Sans", name: "Nunito Sans" },
  { group: "Sans", name: "DM Sans" },
  // Script
  { group: "Script", name: "Mrs Saint Delafield" },
  { group: "Script", name: "Dancing Script" },
  { group: "Script", name: "Great Vibes" },
  { group: "Script", name: "Parisienne" },
  { group: "Script", name: "Sacramento" },
  { group: "Script", name: "Allura" },
  { group: "Script", name: "Tangerine" },
  { group: "Script", name: "Pinyon Script" },
  { group: "Script", name: "Alex Brush" },
  { group: "Script", name: "Herr Von Muellerhoff" },
  { group: "Script", name: "Meow Script" },
  { group: "Script", name: "Yellowtail" },
  { group: "Script", name: "Pacifico" },
  { group: "Script", name: "Satisfy" },
  { group: "Script", name: "Cookie" },
  { group: "Script", name: "Sail" },
  { group: "Script", name: "Amatic SC" },
  { group: "Script", name: "Caveat" },
  { group: "Script", name: "Kalam" },
  { group: "Script", name: "Shadows Into Light" },
  // Display
  { group: "Display", name: "Abril Fatface" },
  { group: "Display", name: "Cinzel" },
  { group: "Display", name: "DM Serif Display" },
  { group: "Display", name: "Italiana" },
  { group: "Display", name: "Cormorant Upright" },
  { group: "Display", name: "Bebas Neue" },
  { group: "Display", name: "Oswald" },
  { group: "Display", name: "Archivo Black" },
  { group: "Display", name: "Fjalla One" },
  { group: "Display", name: "Playfair Display SC" },
  { group: "Display", name: "Cinzel Decorative" },
  { group: "Display", name: "Unica One" },
];

const loadedFonts = new Set<string>();

// Idempotent — safe to call repeatedly for the same family. Guarded for SSR: this app
// renders with TanStack Start, and `document` doesn't exist during server rendering.
export function loadGoogleFont(family: string) {
  if (typeof document === "undefined" || loadedFonts.has(family)) return;
  loadedFonts.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
  document.head.appendChild(link);
}

// Loads only the fonts a given wedding's site actually uses (template defaults + any
// per-section overrides) rather than the whole curated list — called once from the
// editor's live preview and once from the public /w/$slug site.
export function useGoogleFonts(families: (string | undefined)[]) {
  const key = families.filter(Boolean).join("|");
  useEffect(() => {
    key.split("|").forEach((f) => f && loadGoogleFont(f));
  }, [key]);
}

let allFontsLoaded = false;

// Loads the entire curated list in one batched request (one <link>, many `family=`
// params) rather than 80 separate ones — used by the font PICKER UI so every option can
// render live in its own typeface, not the whole site's default font-loading path.
function loadAllGoogleFonts() {
  if (typeof document === "undefined" || allFontsLoaded) return;
  allFontsLoaded = true;
  const toLoad = GOOGLE_FONT_OPTIONS.filter((f) => !loadedFonts.has(f.name));
  toLoad.forEach((f) => loadedFonts.add(f.name));
  if (toLoad.length === 0) return;
  const familyParams = toLoad
    .map((f) => `family=${encodeURIComponent(f.name).replace(/%20/g, "+")}:ital,wght@0,400;0,500;0,600;0,700;1,400`)
    .join("&");
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
  document.head.appendChild(link);
}

// Called by the font picker only once it's actually opened — so the ~80-font batch never
// loads for a wedding's guests, only for the couple while they're browsing font choices.
export function useAllGoogleFontsWhenOpen(open: boolean) {
  useEffect(() => {
    if (open) loadAllGoogleFonts();
  }, [open]);
}
