import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { TourStep } from "@/lib/tours";
import { cn } from "@/lib/utils";

// Finds what a step points at (see lib/tours.ts for the two kinds of target).
export function findTourTarget(target?: string): HTMLElement | null {
  if (!target) return null;
  try {
    if (target.startsWith("text:")) {
      const wanted = target.slice(5).trim().toLowerCase();
      const els = Array.from(document.querySelectorAll<HTMLElement>("main button, main a, aside a, aside button"));
      return els.find((e) => (e.textContent ?? "").trim().toLowerCase().startsWith(wanted) && e.offsetParent !== null) ?? null;
    }
    const el = document.querySelector<HTMLElement>(target);
    return el && el.offsetParent !== null ? el : null;
  } catch { return null; }
}

type Box = { top: number; left: number; width: number; height: number };
const PAD = 8;

// Darkens the whole page except the one thing being explained, which stays in its normal colours inside a rounded
// outline (a circle when it is round or small and square), with a card that says what it is.
export function GuidedTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [cardPos, setCardPos] = useState<{ top: number; left: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = steps[index];
  const last = index === steps.length - 1;

  const measure = useCallback(() => {
    const el = findTourTarget(step?.target);
    if (!el) { setBox(null); return; }
    const r = el.getBoundingClientRect();
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step]);

  // Bring the target into view, then follow it if the window changes size or scrolls.
  useLayoutEffect(() => {
    const el = findTourTarget(step?.target);
    el?.scrollIntoView({ block: "center", inline: "nearest" });
    measure();
    const t = window.setTimeout(measure, 350); // after the smooth scroll settles
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.clearTimeout(t); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [step, measure]);

  // Put the card beside the highlight (below it when there is room, otherwise above or to the side).
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const cw = card.offsetWidth, ch = card.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 16;
    if (!box) { setCardPos({ top: Math.max(16, (vh - ch) / 2), left: Math.max(16, (vw - cw) / 2) }); return; }
    let top = box.top + box.height + gap, left = box.left;
    if (top + ch > vh - 16) top = box.top - ch - gap;
    if (top < 16) { top = Math.min(vh - ch - 16, Math.max(16, box.top)); left = box.left + box.width + gap; }
    if (left + cw > vw - 16) left = Math.max(16, vw - cw - 16);
    setCardPos({ top: Math.max(16, top), left: Math.max(16, left) });
  }, [box, index]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") last ? onClose() : setIndex((i) => i + 1);
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [last, onClose]);

  if (!step) return null;
  const round = box && Math.abs(box.width - box.height) < 14 && box.width < 80;

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* A click anywhere outside the card does nothing: the tour is closed with its buttons or Escape. */}
      {box ? (
        <div aria-hidden className={cn("absolute transition-all duration-300 ease-out", round ? "rounded-full" : "rounded-2xl")}
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 0 9999px rgba(20, 28, 36, 0.72)", outline: "2px solid rgba(255,255,255,0.9)" }} />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[rgba(20,28,36,0.72)]" />
      )}

      <div ref={cardRef} className="absolute w-[min(22rem,calc(100vw-2rem))] rounded-3xl bg-paper p-5 shadow-2xl"
        style={{ top: cardPos?.top ?? -9999, left: cardPos?.left ?? 0 }}>
        <button type="button" onClick={onClose} aria-label="Close tour" className="absolute right-4 top-4 text-muted-foreground hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">{index + 1} of {steps.length}</p>
        <h3 className="mt-1 pr-6 font-serif text-xl leading-tight text-ink">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink">{step.body}</p>
        <div className="mt-4 flex items-center gap-2">
          {index > 0 && (
            <button type="button" onClick={() => setIndex(index - 1)} className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm hover:bg-stone cursor-pointer">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          {!last && <button type="button" onClick={onClose} className="px-2 text-sm text-muted-foreground hover:text-ink cursor-pointer">Skip</button>}
          <button type="button" onClick={() => (last ? onClose() : setIndex(index + 1))} autoFocus
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2 text-sm font-medium text-paper hover:bg-clay cursor-pointer">
            {last ? "Done" : "Next"} {!last && <ArrowRight className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
