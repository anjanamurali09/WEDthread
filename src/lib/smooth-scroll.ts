// Gentle, slowed-down scrolling for the mouse wheel and trackpad on every page: the page glides to a stop instead of
// jumping line by line. Touch screens keep their own native scrolling, and anyone who has asked their device for
// reduced motion keeps ordinary scrolling.
//
// Lists and panels that scroll on their own (menus, dialogs, the notes editor, the horizontal card rows) keep scrolling
// natively, and while a dialog or menu has locked the page behind it the smoothing is paused.

import type Lenis from "lenis";

let instance: Lenis | null = null;
const waiting = new Set<(l: Lenis) => void>();

// Runs `fn` as soon as the smooth scrolling is running (right away if it already is). Never runs on touch-only
// setups or with reduced motion, where the smooth scrolling is not started.
function whenReady(fn: (l: Lenis) => void): () => void {
  if (instance) fn(instance); else waiting.add(fn);
  return () => { waiting.delete(fn); };
}

export function startSmoothScroll(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => undefined;

  let stopped = false;
  let cleanup = () => undefined as void;

  import("lenis").then(({ default: Lenis }) => {
    if (stopped) return;
    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      lerp: 0.075,          // lower = a longer, softer glide
      wheelMultiplier: 0.9,
      allowNestedScroll: true,
    });
    instance = lenis;
    waiting.forEach((fn) => fn(lenis));
    waiting.clear();

    // Radix marks <body> while a dialog, menu or select has locked the page; pause the smoothing then.
    const sync = () => { if (document.body.hasAttribute("data-scroll-locked")) lenis.stop(); else lenis.start(); };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
    sync();

    cleanup = () => { observer.disconnect(); lenis.destroy(); if (instance === lenis) instance = null; };
  }).catch(() => undefined);

  return () => { stopped = true; cleanup(); };
}

// Page-by-page stops for a long marketing page: when the scrolling slows to a halt near the top of one of the
// sections, the page settles on it, so the section is shown whole instead of cut off at the top. Stopping well
// inside a section that is taller than the window leaves the page where it is.
export function snapToSections(sections: HTMLElement[]): () => void {
  let undo = () => undefined as void;
  let cancelled = false;
  const unwait = whenReady((lenis) => {
    import("lenis/snap").then(({ default: Snap }) => {
      if (cancelled) return;
      const snap = new Snap(lenis, { type: "proximity", distanceThreshold: "35%", debounce: 700, duration: 1 });
      const removers = sections.map((el) => snap.addElement(el, { align: ["start"], ignoreTransform: true }));
      undo = () => { removers.forEach((r) => r()); snap.destroy(); };
    }).catch(() => undefined);
  });
  return () => { cancelled = true; unwait(); undo(); };
}
