import hero1Sm from "@/assets/home/hero-1-sm.webp";
import hero1Lg from "@/assets/home/hero-1-lg.webp";
import hero2Sm from "@/assets/home/hero-2-sm.webp";
import hero2Lg from "@/assets/home/hero-2-lg.webp";
import hero3Sm from "@/assets/home/hero-3-sm.webp";
import hero3Lg from "@/assets/home/hero-3-lg.webp";
import hero4Sm from "@/assets/home/hero-4-sm.webp";
import hero4Lg from "@/assets/home/hero-4-lg.webp";
import hero5Sm from "@/assets/home/hero-5-sm.webp";
import hero5Lg from "@/assets/home/hero-5-lg.webp";
import hero6Sm from "@/assets/home/hero-6-sm.webp";
import hero6Lg from "@/assets/home/hero-6-lg.webp";

// The photo in the first screen of the homepage. A different one is picked each time the page is opened.
//
// The page itself is saved at the edge and shared by everyone for a few minutes, so the choice cannot be made on
// the server. A tiny script in the page head makes it in the visitor's browser before anything is drawn, marks the
// page with the number it picked, and asks for just that one picture. A style rule per photo then shows it.
// `pos` is the part of each picture that must stay in view when it is cropped to the frame.
const PHOTOS = [
  { sm: hero1Sm, lg: hero1Lg, pos: "50% 62%" },  // a couple twirling in a woodland clearing
  { sm: hero2Sm, lg: hero2Lg, pos: "50% 88%" },  // a couple under clear umbrellas among redwoods
  { sm: hero3Sm, lg: hero3Lg, pos: "55% 50%" },  // two hands held, with their shadows on the grass
  { sm: hero4Sm, lg: hero4Lg, pos: "50% 78%" },  // a couple walking hand in hand along a beach at sunset
  { sm: hero5Sm, lg: hero5Lg, pos: "50% 50%" },  // a groom's shoes beside the lace of a bridal gown
  { sm: hero6Sm, lg: hero6Lg, pos: "50% 72%" },  // a couple on a jetty on a mountain lake
];

export const HERO_ALT = "A couple on their wedding day";

// Photo 1 shows until the script has chosen (and on any page opened without it).
const rule = (selector: string, p: (typeof PHOTOS)[number]) =>
  `${selector}{background-image:url(${p.sm});background-position:${p.pos}}@media(min-width:1024px){${selector}{background-image:url(${p.lg})}}`;

export const HERO_CSS =
  rule(".hero-photo", PHOTOS[0]) + PHOTOS.map((p, i) => rule(`html[data-hero="${i}"] .hero-photo`, p)).join("");

// Picks a photo and asks for it straight away. Adding ?hero=3 to the address shows photo 4, to check each one.
export const HERO_SCRIPT = `(function(){try{var n=${PHOTOS.length},m=location.search.match(/[?&]hero=(\\d+)/),i=m?Math.min(+m[1],n-1):Math.floor(Math.random()*n),` +
  `d=document.documentElement,w=matchMedia("(min-width:1024px)").matches,s=${JSON.stringify(PHOTOS.map((p) => p.sm))},l=${JSON.stringify(PHOTOS.map((p) => p.lg))};` +
  `d.setAttribute("data-hero",i);var k=document.createElement("link");k.rel="preload";k.as="image";k.href=(w?l:s)[i];document.head.appendChild(k)}catch(e){}})()`;

// For pages reached by clicking through the site, where the head script does not run again.
export function chooseHeroPhoto() {
  const d = document.documentElement;
  if (!d.hasAttribute("data-hero")) d.setAttribute("data-hero", String(Math.floor(Math.random() * PHOTOS.length)));
}
