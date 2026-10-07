// A little trail of blue sparkles that follows the pointer while it moves over matching elements
// (the dashboard's workspace cards). The stars are tiny fixed-position SVGs appended to <body>, so
// no card ever clips them, and each removes itself when its animation ends. Skipped entirely for
// people who prefer reduced motion.
const COLORS = ["#7FA8D6", "#4A7CAD", "#A9C6EA", "#FFE08A"];
const STAR = "M12 0C12 7 17 12 24 12C17 12 12 17 12 24C12 17 7 12 0 12C7 12 12 7 12 0Z";
const MAX_LIVE = 28;

export function attachSparkleTrail(root: HTMLElement, selector = ".paper-card"): () => void {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  let live = 0;
  let lastX = -999, lastY = -999, lastT = 0;

  const spawn = (x: number, y: number) => {
    if (live >= MAX_LIVE) return;
    const size = 8 + Math.random() * 9;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const el = document.createElement("div");
    el.setAttribute("aria-hidden", "true");
    el.style.cssText = `position:fixed;left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px;pointer-events:none;z-index:9999;`;
    el.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}"><path d="${STAR}" fill="${color}"/></svg>`;
    document.body.appendChild(el);
    live++;
    const dx = (Math.random() - 0.5) * 26, dy = 10 + Math.random() * 22;
    const anim = el.animate(
      [
        { transform: "translate(0,0) scale(0.2) rotate(0deg)", opacity: 0 },
        { transform: `translate(${dx * 0.3}px,${dy * 0.2}px) scale(1) rotate(40deg)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${dx}px,${dy}px) scale(0.1) rotate(160deg)`, opacity: 0 },
      ],
      { duration: 650 + Math.random() * 350, easing: "ease-out" },
    );
    anim.onfinish = () => { el.remove(); live--; };
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch" || !(e.target as HTMLElement | null)?.closest?.(selector)) return;
    const now = performance.now();
    if (now - lastT < 45 || Math.hypot(e.clientX - lastX, e.clientY - lastY) < 12) return;
    lastT = now; lastX = e.clientX; lastY = e.clientY;
    spawn(e.clientX + (Math.random() - 0.5) * 8, e.clientY + (Math.random() - 0.5) * 8);
  };
  root.addEventListener("pointermove", onMove);
  return () => root.removeEventListener("pointermove", onMove);
}
