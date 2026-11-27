// Gentle, slowed-down scrolling for the mouse wheel and trackpad on every page: the page glides to a stop instead of
// jumping line by line. Touch screens keep their own native scrolling, and anyone who has asked their device for
// reduced motion keeps ordinary scrolling.
//
// Lists and panels that scroll on their own (menus, dialogs, the notes editor, the horizontal card rows) keep scrolling
// natively, and while a dialog or menu has locked the page behind it the smoothing is paused.

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

    // Radix marks <body> while a dialog, menu or select has locked the page; pause the smoothing then.
    const sync = () => { if (document.body.hasAttribute("data-scroll-locked")) lenis.stop(); else lenis.start(); };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-scroll-locked"] });
    sync();

    cleanup = () => { observer.disconnect(); lenis.destroy(); };
  }).catch(() => undefined);

  return () => { stopped = true; cleanup(); };
}
